import { VoicePack, VoicePackMeta, AudioClip, SteamUser } from '@/types/voicepack';

const API_BASE = '/api';

// ── Auth ────────────────────────────────────────────────────────────────────

/** Get the current logged-in user, or null if not logged in */
export async function getCurrentUser(): Promise<SteamUser | null> {
  const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (!response.ok) return null;
  const data = await response.json();
  return data.user ?? null;
}

/** Get the Steam login redirect URL */
export function getSteamLoginUrl(): string {
  return `${API_BASE}/auth/steam/login`;
}

/** Log out (clear session cookie) */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}

// ── Voicepacks ──────────────────────────────────────────────────────────────

/** Upload a complete voice pack to the server for conversion + packaging */
export async function uploadVoicePack(pack: VoicePack): Promise<{ id: string; downloadUrl: string }> {
  const formData = new FormData();

  formData.append('name', pack.name);
  formData.append('author', pack.author);
  formData.append('gender', pack.gender);
  formData.append('description', pack.description);

  // Append each clip with action/index metadata
  for (const [action, clips] of Object.entries(pack.clips)) {
    clips.forEach((clip: AudioClip, index: number) => {
      formData.append(`clips`, clip.blob, `${action}_${index + 1}.webm`);
      formData.append(`clip_actions`, action);
    });
  }

  const response = await fetch(`${API_BASE}/voicepacks/build`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }

  return response.json();
}

/** Publish a built voice pack to the community library */
export async function publishVoicePack(id: string): Promise<VoicePackMeta> {
  const response = await fetch(`${API_BASE}/voicepacks/${id}/publish`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Login required');
    throw new Error('Publish failed');
  }
  return response.json();
}

/** List community voice packs */
export async function listVoicePacks(page = 1, limit = 20): Promise<{
  packs: VoicePackMeta[];
  total: number;
}> {
  const response = await fetch(`${API_BASE}/voicepacks?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load voice packs');
  return response.json();
}

/** Delete a published voice pack (owner only) */
export async function deleteVoicePack(packId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/voicepacks/${packId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(err.detail || 'Delete failed');
  }
}

/** Download a built (unpublished) voice pack zip */
export function getDownloadUrl(id: string): string {
  return `${API_BASE}/voicepacks/${id}/download`;
}

/** Download a published voice pack zip */
export function getPublishedDownloadUrl(id: string): string {
  return `${API_BASE}/voicepacks/${id}/download-published`;
}
