import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { createJwtToken, verifyJwtToken, getCookieValue, COOKIE_NAME, COOKIE_MAX_AGE } from '../lib/jwt';
import { buildSteamOpenIdParams, verifySteamOpenId, fetchSteamProfile, STEAM_OPENID_URL } from '../lib/steam';
import { setCookie, deleteCookie } from 'hono/cookie';

export const authRoutes = new Hono<{ Bindings: Env }>();

/** Redirect to Steam's OpenID login page (or dev bypass) */
authRoutes.get('/steam/login', async (c) => {
  const env = c.env;

  // Dev bypass: only active when running locally (non-HTTPS). Setting
  // DEV_STEAM_ID in a production Cloudflare secret has no effect.
  if (env.DEV_STEAM_ID && !env.SITE_ORIGIN.startsWith('https://')) {
    const profile = await fetchSteamProfile(env.DEV_STEAM_ID, env.STEAM_API_KEY);
    const token = await createJwtToken(profile, env.JWT_SECRET);
    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: env.SITE_ORIGIN.startsWith('https'),
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return c.redirect(env.SITE_ORIGIN, 302);
  }

  const returnTo = `${env.SITE_ORIGIN}/api/auth/steam/callback`;
  const realm = `${env.SITE_ORIGIN}/`;
  const params = buildSteamOpenIdParams(returnTo, realm);
  const qs = new URLSearchParams(params).toString();
  return c.redirect(`${STEAM_OPENID_URL}?${qs}`, 302);
});

/** Handle Steam's OpenID callback */
authRoutes.get('/steam/callback', async (c) => {
  const env = c.env;
  const queryParams: Record<string, string> = {};
  for (const [key, value] of new URL(c.req.url).searchParams) {
    queryParams[key] = value;
  }

  const steamId = await verifySteamOpenId(queryParams);
  if (!steamId) {
    return c.redirect(`${env.SITE_ORIGIN}/?auth_error=1`, 302);
  }

  const profile = await fetchSteamProfile(steamId, env.STEAM_API_KEY);
  const token = await createJwtToken(profile, env.JWT_SECRET);
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: env.SITE_ORIGIN.startsWith('https'),
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return c.redirect(env.SITE_ORIGIN, 302);
});

/** Return the current logged-in user, or null */
authRoutes.get('/me', async (c) => {
  const cookieHeader = c.req.header('Cookie');
  const token = getCookieValue(cookieHeader, COOKIE_NAME);
  if (!token) return c.json({ user: null });

  const payload = await verifyJwtToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ user: null });

  return c.json({
    user: {
      steamId: payload.steam_id,
      personaName: payload.persona_name,
      avatarUrl: payload.avatar_url,
    },
  });
});

/** Clear the session cookie */
authRoutes.post('/logout', (c) => {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
  return c.json({ ok: true });
});

/**
 * Helper: Get the current user from the request cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(c: { req: { header: (name: string) => string | undefined }; env: { JWT_SECRET: string } }): Promise<JwtPayload | null> {
  const cookieHeader = c.req.header('Cookie');
  const token = getCookieValue(cookieHeader, COOKIE_NAME);
  if (!token) return null;
  return verifyJwtToken(token, c.env.JWT_SECRET);
}

/**
 * Helper: Require authentication. Throws 401 if not logged in.
 */
export async function requireUser(c: { req: { header: (name: string) => string | undefined }; env: { JWT_SECRET: string } }): Promise<JwtPayload> {
  const user = await getCurrentUser(c);
  if (!user) throw new Error('Login required');
  return user;
}
