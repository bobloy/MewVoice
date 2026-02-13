import type { SteamProfile } from '../types';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

export { STEAM_OPENID_URL };

/** Build query parameters for Steam OpenID 2.0 authentication request */
export function buildSteamOpenIdParams(returnTo: string, realm: string): Record<string, string> {
  return {
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  };
}

/** Verify a Steam OpenID callback. Returns Steam ID or null. */
export async function verifySteamOpenId(params: Record<string, string>): Promise<string | null> {
  const validationParams = new URLSearchParams({ ...params, 'openid.mode': 'check_authentication' });

  const resp = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: validationParams.toString(),
  });

  const text = await resp.text();
  if (!text.includes('is_valid:true')) return null;

  const claimedId = params['openid.claimed_id'] || '';
  const steamId = claimedId.split('/').pop() || '';
  if (!/^\d+$/.test(steamId)) return null;

  return steamId;
}

/** Fetch a Steam user's profile via the Steam Web API */
export async function fetchSteamProfile(steamId: string, apiKey: string): Promise<SteamProfile> {
  if (!apiKey) {
    return {
      steam_id: steamId,
      persona_name: `User_${steamId.slice(-4)}`,
      avatar_url: '',
    };
  }

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json() as { response?: { players?: Array<{ personaname?: string; avatarmedium?: string }> } };
    const players = data?.response?.players || [];

    if (players.length === 0) {
      return { steam_id: steamId, persona_name: 'Unknown', avatar_url: '' };
    }

    return {
      steam_id: steamId,
      persona_name: players[0].personaname || 'Unknown',
      avatar_url: players[0].avatarmedium || '',
    };
  } catch {
    return { steam_id: steamId, persona_name: 'Unknown', avatar_url: '' };
  }
}
