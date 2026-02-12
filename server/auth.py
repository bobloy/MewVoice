"""
MewVoice — Steam OpenID 2.0 Authentication

Handles Steam login flow, JWT session cookies, and Steam Web API profile lookups.
No OpenID library needed — Steam's protocol is simple enough to implement directly.
"""

import os
import time
import urllib.parse

import jwt
import httpx
from fastapi import Request, HTTPException


# ── Configuration ────────────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("JWT_SECRET", "mewvoice-dev-secret-key-change-me-in-production!!")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 7  # 7 days

STEAM_API_KEY = os.environ.get("STEAM_API_KEY", "")
STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"

# Used for OpenID return_to and final redirect — avoids proxy header issues
SITE_ORIGIN = os.environ.get("SITE_ORIGIN", "http://localhost:3000")

# Dev bypass: set to a Steam ID to skip Steam login entirely
DEV_STEAM_ID = os.environ.get("DEV_STEAM_ID", "")

COOKIE_NAME = "mewvoice_session"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


# ── Steam OpenID 2.0 ────────────────────────────────────────────────────────

def build_steam_openid_params(return_to: str, realm: str) -> dict:
    """Build the query parameters for a Steam OpenID 2.0 authentication request."""
    return {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": return_to,
        "openid.realm": realm,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    }


async def verify_steam_openid(params: dict) -> str | None:
    """Verify a Steam OpenID callback. Returns Steam ID or None on failure.

    Takes the full query parameters from the callback URL, changes the mode
    to check_authentication, POSTs them back to Steam, and checks the response.
    """
    validation_params = dict(params)
    validation_params["openid.mode"] = "check_authentication"

    async with httpx.AsyncClient() as client:
        resp = await client.post(STEAM_OPENID_URL, data=validation_params)

    if "is_valid:true" not in resp.text:
        return None

    # Extract Steam ID from claimed_id
    # Format: https://steamcommunity.com/openid/id/76561198XXXXXXXXX
    claimed_id = params.get("openid.claimed_id", "")
    steam_id = claimed_id.rsplit("/", 1)[-1]
    if not steam_id.isdigit():
        return None

    return steam_id


# ── Steam Web API ────────────────────────────────────────────────────────────

async def fetch_steam_profile(steam_id: str) -> dict:
    """Fetch a Steam user's profile (name + avatar) via the Steam Web API.

    Requires STEAM_API_KEY env var. Returns a fallback if not set.
    """
    api_key = os.environ.get("STEAM_API_KEY", "") or STEAM_API_KEY
    if not api_key:
        return {
            "steam_id": steam_id,
            "persona_name": f"User_{steam_id[-4:]}",
            "avatar_url": "",
        }

    url = (
        f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
        f"?key={api_key}&steamids={steam_id}"
    )

    async with httpx.AsyncClient() as client:
        resp = await client.get(url)

    try:
        players = resp.json().get("response", {}).get("players", [])
    except Exception:
        players = []

    if not players:
        return {
            "steam_id": steam_id,
            "persona_name": "Unknown",
            "avatar_url": "",
        }

    p = players[0]
    return {
        "steam_id": steam_id,
        "persona_name": p.get("personaname", "Unknown"),
        "avatar_url": p.get("avatarmedium", ""),
    }


# ── JWT Session ──────────────────────────────────────────────────────────────

def create_jwt_token(profile: dict) -> str:
    """Create a signed JWT containing the user's Steam profile."""
    payload = {
        "steam_id": profile["steam_id"],
        "persona_name": profile["persona_name"],
        "avatar_url": profile["avatar_url"],
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(request: Request) -> dict | None:
    """Read the session cookie and return the user profile, or None."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def require_user(request: Request) -> dict:
    """Like get_current_user, but raises 401 if not logged in."""
    user = get_current_user(request)
    if not user:
        raise HTTPException(401, "Login required")
    return user
