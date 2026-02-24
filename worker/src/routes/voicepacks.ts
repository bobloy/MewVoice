import { Hono } from 'hono';
import type { Env, PackRowWithVote } from '../types';
import { VALID_ACTIONS, RECOMMENDED_CLIPS, packRowToMeta } from '../types';
import { validateWav } from '../lib/wav';
import { buildVoicePackZip, listWavFiles, extractFile, MEWVOICE_TOOL_VERSION } from '../lib/zip';
import { getCurrentUser, requireUser } from './auth';

export const voicepackRoutes = new Hono<{ Bindings: Env }>();

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

/** Build a voice pack from uploaded WAV clips */
voicepackRoutes.post('/build', async (c) => {
  const contentLength = parseInt(c.req.header('content-length') || '0');
  if (contentLength > MAX_UPLOAD_BYTES) {
    return c.json({ detail: 'Upload too large (max 50 MB)' }, 413);
  }

  const body = await c.req.parseBody({ all: true });

  const name = String(body['name'] || '');
  const author = String(body['author'] || '');
  const gender = String(body['gender'] || 'male');
  const description = String(body['description'] || '');

  // Input validation
  if (name.length > 50) return c.json({ detail: 'Pack name must be 50 characters or less' }, 400);
  if (description.length > 200) return c.json({ detail: 'Description must be 200 characters or less' }, 400);
  if (author.length > 50) return c.json({ detail: 'Author must be 50 characters or less' }, 400);
  if (!name.trim()) return c.json({ detail: 'Pack name is required' }, 400);

  // Parse clips and actions
  const clipFiles = Array.isArray(body['clips']) ? body['clips'] : body['clips'] ? [body['clips']] : [];
  const clipActions = Array.isArray(body['clip_actions']) ? body['clip_actions'] : body['clip_actions'] ? [body['clip_actions']] : [];

  if (clipFiles.length !== clipActions.length) {
    return c.json({ detail: 'clips and clip_actions count mismatch' }, 400);
  }
  if (clipFiles.length === 0) {
    return c.json({ detail: 'No clips provided' }, 400);
  }

  const validActions = new Set<string>(VALID_ACTIONS);
  for (const a of clipActions) {
    if (!validActions.has(String(a))) {
      return c.json({ detail: `Invalid action: ${a}` }, 400);
    }
  }

  // Generate build ID and pack name
  const buildId = crypto.randomUUID().slice(0, 8);
  let safeName = name.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '').replace(/^_+|_+$/g, '').slice(0, 40);
  if (!safeName) safeName = 'custom';
  const packName = `custom_${safeName}_${buildId}`;

  // Group clips by action and validate WAV headers
  const actionClips: Record<string, { index: number; data: ArrayBuffer }[]> = {};
  const clipCounts: Record<string, number> = {};

  for (let i = 0; i < clipFiles.length; i++) {
    const file = clipFiles[i];
    const action = String(clipActions[i]);

    if (!(file instanceof File)) {
      return c.json({ detail: `Clip ${i} is not a file` }, 400);
    }

    const data = await file.arrayBuffer();

    // Validate WAV header
    try {
      validateWav(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid WAV';
      return c.json({ detail: `${action} clip ${(actionClips[action]?.length || 0) + 1}: ${msg}` }, 422);
    }

    if (!actionClips[action]) actionClips[action] = [];
    actionClips[action].push({ index: actionClips[action].length + 1, data });
  }

  // Build clip counts
  for (const [action, clips] of Object.entries(actionClips)) {
    clipCounts[action] = clips.length;
  }

  // Create WAV file list for ZIP builder
  const wavFiles = Object.entries(actionClips).flatMap(([action, clips]) =>
    clips.map((clip) => ({ action, index: clip.index, data: clip.data })),
  );

  const metadata = {
    name,
    author,
    gender,
    description,
    pack_name: packName,
    build_id: buildId,
    clip_counts: clipCounts,
    created_at: new Date().toISOString(),
    tool_version: MEWVOICE_TOOL_VERSION,
  };

  // Build ZIP in memory
  const zipBuffer = await buildVoicePackZip(packName, metadata, wavFiles);

  // Upload to R2
  const r2Key = `builds/${buildId}.zip`;
  await c.env.PACKS_BUCKET.put(r2Key, zipBuffer);

  // Store build metadata in D1 (unpublished)
  await c.env.DB.prepare(
    `INSERT INTO packs (id, name, author, gender, description, clip_counts, created_at, r2_key, published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  )
    .bind(buildId, name, author, gender, description, JSON.stringify(clipCounts), metadata.created_at, r2Key)
    .run();

  return c.json({
    id: buildId,
    packName,
    downloadUrl: `/api/voicepacks/${buildId}/download`,
    tool_version: MEWVOICE_TOOL_VERSION,
  });
});

/** Download a built (unpublished) voice pack ZIP */
voicepackRoutes.get('/:buildId/download', async (c) => {
  const buildId = c.req.param('buildId');

  // Restrict to unpublished builds created within the last 7 days.
  // This prevents indefinite exposure of builds and stops the endpoint
  // from serving published packs (which have their own download route).
  const row = await c.env.DB.prepare(
    `SELECT r2_key FROM packs
     WHERE id = ? AND published = 0
       AND created_at > datetime('now', '-7 days')`,
  ).bind(buildId).first<{ r2_key: string }>();
  if (!row) return c.json({ detail: 'Voice pack not found' }, 404);

  const obj = await c.env.PACKS_BUCKET.get(row.r2_key);
  if (!obj) return c.json({ detail: 'Voice pack not found' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="mewgenics_voicepack_${buildId}.zip"`,
    },
  });
});

/** Publish a built voice pack to the community library */
voicepackRoutes.post('/:buildId/publish', async (c) => {
  let user;
  try {
    user = await requireUser(c);
  } catch {
    return c.json({ detail: 'Login required' }, 401);
  }

  const buildId = c.req.param('buildId');

  const row = await c.env.DB.prepare('SELECT r2_key FROM packs WHERE id = ? AND published = 0').bind(buildId).first<{ r2_key: string }>();
  if (!row) return c.json({ detail: 'Build not found' }, 404);

  // Copy from builds/ to library/ in R2
  // TODO: Use R2's native copy feature if/when available, or stream the data instead of buffering the entire ZIP into worker memory.
  const buildObj = await c.env.PACKS_BUCKET.get(row.r2_key);
  if (!buildObj) return c.json({ detail: 'Build not found in storage' }, 404);
  const zipData = await buildObj.arrayBuffer();

  const libraryKey = `library/${buildId}.zip`;
  await c.env.PACKS_BUCKET.put(libraryKey, zipData);

  // Update D1: mark as published, set ownership and initial score
  await c.env.DB.prepare(
    `UPDATE packs SET published = 1, score = 1, r2_key = ?, steam_id = ?, steam_name = ?, steam_avatar = ? WHERE id = ?`,
  )
    .bind(libraryKey, user.steam_id, user.persona_name, user.avatar_url, buildId)
    .run();

  // Delete original build from R2 to save space
  await c.env.PACKS_BUCKET.delete(row.r2_key);

  // Auto-upvote by author
  await c.env.DB.prepare('INSERT OR REPLACE INTO votes (pack_id, steam_id, vote) VALUES (?, ?, 1)')
    .bind(buildId, user.steam_id)
    .run();

  // Return the published pack metadata
  const pack = await c.env.DB.prepare(
    `SELECT p.*, v.vote as user_vote FROM packs p LEFT JOIN votes v ON v.pack_id = p.id AND v.steam_id = ? WHERE p.id = ?`,
  )
    .bind(user.steam_id, buildId)
    .first<PackRowWithVote>();

  if (!pack) return c.json({ detail: 'Pack not found after publish' }, 500);
  return c.json(packRowToMeta(pack));
});

/** List published voice packs with filtering, sorting, and pagination */
voicepackRoutes.get('/', async (c) => {
  const user = await getCurrentUser(c);

  // Check cache for anonymous requests
  const cache = caches.default;
  const cacheKey = new Request(c.req.url, c.req.raw);
  if (!user) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const offset = Math.max(0, parseInt(c.req.query('offset') || '0') || 0);
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20') || 20));
  const sortRaw = c.req.query('sort') || 'newest';
  const sort = sortRaw === 'top' ? 'top' : 'newest';
  const q = (c.req.query('q') || '').slice(0, 100);
  const genderRaw = c.req.query('gender') || 'all';
  const gender = ['male', 'female', 'all'].includes(genderRaw) ? genderRaw : 'all';
  const minScore = parseInt(c.req.query('minScore') || '0') || 0;
  const hasRecommended = c.req.query('hasRecommended') === 'true';
  const authorFilter = c.req.query('author') || '';

  // Build dynamic WHERE clause
  const conditions: string[] = ['p.published = 1'];
  const params: (string | number)[] = [];

  if (q) {
    const pattern = `%${q}%`;
    conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.steam_name LIKE ? OR p.author LIKE ?)');
    params.push(pattern, pattern, pattern, pattern);
  }

  if (gender !== 'all') {
    conditions.push('p.gender = ?');
    params.push(gender);
  }

  conditions.push('p.score >= ?');
  params.push(minScore);

  if (authorFilter) {
    conditions.push('p.steam_id = ?');
    params.push(authorFilter);
  }

  const whereClause = conditions.join(' AND ');
  const orderClause = sort === 'top' ? 'p.score DESC, p.created_at DESC' : 'p.created_at DESC';

  // Count total matching
  const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM packs p WHERE ${whereClause}`)
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total || 0;

  // Fetch page with optional user vote join
  // TODO: Consider keyset/cursor-based pagination instead of OFFSET for better performance as the library grows.
  const steamId = user?.steam_id || '';
  const query = `
    SELECT p.*, v.vote as user_vote
    FROM packs p
    LEFT JOIN votes v ON v.pack_id = p.id AND v.steam_id = ?
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const result = await c.env.DB.prepare(query)
    .bind(steamId, ...params, limit, offset)
    .all<PackRowWithVote>();

  let packs = (result.results || []).map(packRowToMeta);

  // Client-side filter for hasRecommended (uses JSON clip_counts)
  if (hasRecommended) {
    packs = packs.filter((p) =>
      Object.entries(RECOMMENDED_CLIPS).every(
        ([action, rec]) => (p.clipCounts[action] || 0) >= rec,
      ),
    );
  }

  if (!user) {
    packs.forEach((p) => { p.userVote = null; });
  } else {
    packs.forEach((p) => { if (p.userVote === null) p.userVote = 0; });
  }

  const response = c.json({
    packs,
    total,
    hasMore: offset + limit < total,
  });

  // Cache anonymous responses for 1 minute
  // TODO: Make this TTL configurable via environment variables.
  if (!user) {
    response.headers.set('Cache-Control', 'public, max-age=60');
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  } else {
    response.headers.set('Cache-Control', 'private, no-cache');
  }

  return response;
});

/** Vote on a voice pack */
voicepackRoutes.post('/:packId/vote', async (c) => {
  let user;
  try {
    user = await requireUser(c);
  } catch {
    return c.json({ detail: 'Login required' }, 401);
  }

  const packId = c.req.param('packId');
  const body = await c.req.json<{ vote: number }>();
  const vote = body.vote;

  if (![1, -1, 0].includes(vote)) {
    return c.json({ detail: 'Vote must be 1, -1, or 0' }, 400);
  }

  // Check pack exists
  const pack = await c.env.DB.prepare('SELECT id FROM packs WHERE id = ? AND published = 1').bind(packId).first();
  if (!pack) return c.json({ detail: 'Voice pack not found' }, 404);

  if (vote === 0) {
    // Remove vote
    await c.env.DB.prepare('DELETE FROM votes WHERE pack_id = ? AND steam_id = ?')
      .bind(packId, user.steam_id)
      .run();
  } else {
    // Upsert vote
    await c.env.DB.prepare('INSERT OR REPLACE INTO votes (pack_id, steam_id, vote) VALUES (?, ?, ?)')
      .bind(packId, user.steam_id, vote)
      .run();
  }

  // Recalculate score
  const scoreResult = await c.env.DB.prepare('SELECT COALESCE(SUM(vote), 0) as score FROM votes WHERE pack_id = ?')
    .bind(packId)
    .first<{ score: number }>();
  const newScore = scoreResult?.score || 0;

  await c.env.DB.prepare('UPDATE packs SET score = ? WHERE id = ?').bind(newScore, packId).run();

  return c.json({ score: newScore, userVote: vote });
});

/** Preview a random WAV clip from a published pack */
voicepackRoutes.get('/:packId/preview', async (c) => {
  const packId = c.req.param('packId');
  const actionFilter = c.req.query('action') || '';

  // Check cache
  const cache = caches.default;
  const cached = await cache.match(c.req.raw);
  if (cached) return cached;

  const row = await c.env.DB.prepare('SELECT r2_key FROM packs WHERE id = ? AND published = 1').bind(packId).first<{ r2_key: string }>();
  if (!row) return c.json({ detail: 'Not found' }, 404);

  const obj = await c.env.PACKS_BUCKET.get(row.r2_key);
  if (!obj) return c.json({ detail: 'Not found' }, 404);

  const zipData = await obj.arrayBuffer();
  const wavFiles = await listWavFiles(zipData, actionFilter || undefined);

  if (wavFiles.length === 0) {
    return c.json({ detail: 'No clips found' }, 404);
  }

  const chosen = wavFiles[Math.floor(Math.random() * wavFiles.length)];
  const wavData = await extractFile(zipData, chosen);

  const response = new Response(wavData, {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'public, max-age=3600', // Cache previews for 1 hour
    },
  });

  c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

/** Download a published voice pack ZIP */
voicepackRoutes.get('/:packId/download-published', async (c) => {
  const packId = c.req.param('packId');

  const row = await c.env.DB.prepare('SELECT r2_key FROM packs WHERE id = ? AND published = 1').bind(packId).first<{ r2_key: string }>();
  if (!row) return c.json({ detail: 'Not found' }, 404);

  // Increment download counter
  await c.env.DB.prepare('UPDATE packs SET downloads = downloads + 1 WHERE id = ?').bind(packId).run();

  const obj = await c.env.PACKS_BUCKET.get(row.r2_key);
  if (!obj) return c.json({ detail: 'Not found' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="mewgenics_voicepack_${packId}.zip"`,
    },
  });
});

/** Delete a published voice pack (owner only) */
voicepackRoutes.delete('/:packId', async (c) => {
  let user;
  try {
    user = await requireUser(c);
  } catch {
    return c.json({ detail: 'Login required' }, 401);
  }

  const packId = c.req.param('packId');

  const row = await c.env.DB.prepare('SELECT steam_id, r2_key FROM packs WHERE id = ? AND published = 1')
    .bind(packId)
    .first<{ steam_id: string; r2_key: string }>();

  if (!row) return c.json({ detail: 'Voice pack not found' }, 404);
  if (row.steam_id !== user.steam_id) {
    return c.json({ detail: 'You can only delete your own voice packs' }, 403);
  }

  // Delete from D1 (CASCADE will clean up votes)
  await c.env.DB.prepare('DELETE FROM packs WHERE id = ?').bind(packId).run();

  // Delete from R2
  await c.env.PACKS_BUCKET.delete(row.r2_key);

  return c.json({ ok: true, id: packId });
});
