/** Cloudflare Worker environment bindings */
export interface Env {
  PACKS_BUCKET: R2Bucket;
  DB: D1Database;
  JWT_SECRET: string;
  STEAM_API_KEY: string;
  SITE_ORIGIN: string;
  DEV_STEAM_ID?: string;
  /** Cache TTL in seconds for anonymous pack-list responses. Defaults to 60. */
  CACHE_TTL_SECONDS?: string;
}

/** Decoded JWT payload */
export interface JwtPayload {
  steam_id: string;
  persona_name: string;
  avatar_url: string;
  exp: number;
}

/** Steam profile from the Steam Web API */
export interface SteamProfile {
  steam_id: string;
  persona_name: string;
  avatar_url: string;
}

/** Voice pack row from D1 */
export interface PackRow {
  id: string;
  name: string;
  author: string;
  gender: string;
  description: string;
  clip_counts: string; // JSON
  created_at: string;
  downloads: number;
  score: number;
  steam_id: string | null;
  steam_name: string | null;
  steam_avatar: string | null;
  r2_key: string;
  published: number;
}

/** Pack row with joined vote data */
export interface PackRowWithVote extends PackRow {
  user_vote: number | null;
}

/** API response format for pack metadata */
export interface PackMeta {
  id: string;
  name: string;
  author: string;
  gender: string;
  description: string;
  clipCounts: Record<string, number>;
  createdAt: string;
  downloads: number;
  score: number;
  userVote: number | null;
  steamId: string | null;
  steamName: string | null;
  steamAvatar: string | null;
}

/** Valid voice actions */
export const VALID_ACTIONS = [
  'Angry', 'Death', 'Happy', 'Hiss', 'Hit', 'Normal', 'Purr', 'Sad', 'Sing',
] as const;

/** Recommended clip counts per action */
export const RECOMMENDED_CLIPS: Record<string, number> = {
  Normal: 4, Hit: 5, Angry: 4, Happy: 4,
  Death: 4, Sad: 4, Hiss: 4, Purr: 4, Sing: 1,
};

/** Convert a D1 pack row to API response format */
export function packRowToMeta(row: PackRowWithVote): PackMeta {
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    gender: row.gender,
    description: row.description,
    clipCounts: JSON.parse(row.clip_counts),
    createdAt: row.created_at,
    downloads: row.downloads,
    score: row.score,
    userVote: row.user_vote,
    steamId: row.steam_id,
    steamName: row.steam_name,
    steamAvatar: row.steam_avatar,
  };
}
