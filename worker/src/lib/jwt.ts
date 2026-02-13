import { SignJWT, jwtVerify } from 'jose';
import type { SteamProfile, JwtPayload } from '../types';

const COOKIE_NAME = 'mewvoice_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export { COOKIE_NAME, COOKIE_MAX_AGE };

export async function createJwtToken(profile: SteamProfile, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({
    steam_id: profile.steam_id,
    persona_name: profile.persona_name,
    avatar_url: profile.avatar_url,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyJwtToken(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}
