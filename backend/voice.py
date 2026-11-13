"""Character voices via ElevenLabs (Cyber Missions Phase 2 — Cypher first).

Backend-only: the ElevenLabs key lives only here (env var ELEVENLABS_API_KEY)
and per-character voice IDs come from CYPHER_VOICE_ID / SENTINEL_VOICE_ID /
PATCH_VOICE_ID. The browser never sees a key or a voice ID — it sends
{character, text} and gets audio back (base64 MP3) or a text-only fallback.

Design (all three characters are configured; only Cypher is wired + tested
this round — Sentinel's briefing voice and Patch's troubleshooting voice
come with their milestones, after the Cypher pipeline is proven):
- POST /voice/speak — auth + subscription gate (same as the AI tutor: voice
  spends real money, so it is a subscriber benefit, 402 for free users) +
  per-user rate limit, then the provider. Identical text is never
  regenerated: a disk cache keyed by character + model + text hash serves
  repeats (mission briefings are reused constantly).
- GET /voice/status — which characters have a voice configured (no key
  material, no voice IDs — just booleans the UI uses to show/hide Listen).
- No key or no voice ID for the character -> HTTP 200 text-only fallback
  ({audio_b64: null, fallback: true}), never a 500. A provider failure
  degrades the same way. The frontend shows the subtitles either way.
- Usage is logged to voice_calls (character, model, char count, cached,
  error) for cost-per-student measurement. cost_usd stays None ("unknown"):
  ElevenLabs pricing is plan-dependent and no list price is asserted here —
  chars + model let the cost be computed from the account's own plan.
- The request text is never stored: the DB row holds only the char count,
  and the cache file is named by hash. English first; the model
  (eleven_multilingual_v2) also covers French and Haitian Creole later.
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.deps import require_user_id
from billing import is_subscribed

log = logging.getLogger("voice")


def _load_dotenv(path: Path = Path(__file__).with_name(".env")) -> None:
    """Minimal backend/.env loader for local dev; real env vars always win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()
router = APIRouter()

MODEL = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech"
RATE_LIMIT = int(os.getenv("VOICE_RATE_LIMIT", "30"))  # generations per window per user
RATE_WINDOW = int(os.getenv("VOICE_RATE_WINDOW", "3600"))  # seconds
MAX_TEXT_CHARS = 2000

#: Character -> env var holding that character's ElevenLabs voice ID.
CHARACTER_VOICE_ENV = {
    "cypher": "CYPHER_VOICE_ID",
    "sentinel": "SENTINEL_VOICE_ID",
    "patch": "PATCH_VOICE_ID",
}

#: Disk cache for generated audio. Identical briefings are re-spoken often;
#: the cache means they are generated once. Default lives next to this file
#: and is never committed (see .gitignore — backend/.voice-cache/).
CACHE_DIR = Path(os.getenv("VOICE_CACHE_DIR", Path(__file__).with_name(".voice-cache")))
CACHE_MAX_BYTES = int(os.getenv("VOICE_CACHE_MAX_MB", "200")) * 1024 * 1024


def voice_id_for(character: str) -> Optional[str]:
    return os.getenv(CHARACTER_VOICE_ENV[character]) or None


def cache_key(character: str, text: str) -> str:
    return hashlib.sha256(f"{character}|{MODEL}|{text}".encode()).hexdigest()


def _cache_path(key: str) -> Path:
    return CACHE_DIR / f"{key}.mp3"


def _cache_read(key: str) -> Optional[bytes]:
    try:
        p = _cache_path(key)
        if p.exists():
            p.touch()  # LRU: a hit refreshes the mtime
            return p.read_bytes()
    except OSError:
        log.warning("voice cache read failed for %s", key)
    return None


def _cache_write(key: str, audio: bytes) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _cache_path(key).write_bytes(audio)
        # Evict oldest files until the cache fits the cap.
        files = sorted(CACHE_DIR.glob("*.mp3"), key=lambda p: p.stat().st_mtime)
        total = sum(p.stat().st_size for p in files)
        for p in files:
            if total <= CACHE_MAX_BYTES:
                break
            total -= p.stat().st_size
            p.unlink()
    except OSError:
        log.warning("voice cache write failed for %s", key)


def _log_call(user_id: str, character: str, chars: int, cached: bool, error: bool) -> None:
    """Append one row to voice_calls. Logging must never break the answer:
    any failure is warned and swallowed."""
    try:
        import db
        from db_models import VoiceCall

        with db.SessionLocal() as s:
            s.add(
                VoiceCall(
                    user_id=user_id,
                    character=character,
                    model=MODEL,
                    chars=chars,
                    cost_usd=None,  # unknown — see module docstring
                    cached=cached,
                    error=error,
                )
            )
            s.commit()
    except Exception:
        log.exception("voice call logging failed for user %s", user_id)


# ---------- rate limiting (per user, separate bucket from the tutor) ----------

_hits: dict[str, deque] = defaultdict(deque)


def check_rate(key: str, now: Optional[float] = None) -> None:
    now = now or time.time()
    q = _hits[key]
    while q and q[0] <= now - RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        retry = int(q[0] + RATE_WINDOW - now) + 1
        raise HTTPException(status_code=429, detail="Voice limit reached. Try again later.", headers={"Retry-After": str(retry)})
    q.append(now)


# ---------- ElevenLabs provider ----------

class ElevenLabsProvider:
    """Thin wrapper over the ElevenLabs text-to-speech endpoint. Tests
    replace get_provider() with a fake; production constructs this only
    when a key is configured."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    def synthesize(self, voice_id: str, text: str) -> bytes:
        import httpx

        resp = httpx.post(
            f"{ELEVENLABS_URL}/{voice_id}",
            headers={"xi-api-key": self.api_key, "Content-Type": "application/json"},
            json={
                "text": text,
                "model_id": MODEL,
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.content


def get_provider() -> Optional[ElevenLabsProvider]:
    """Returns a provider, or None when no key is configured. Tests replace this."""
    key = os.getenv("ELEVENLABS_API_KEY")
    if not key:
        return None
    return ElevenLabsProvider(key)


# ---------- routes ----------

class SpeakReq(BaseModel):
    character: str = Field(max_length=32)
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)


@router.get("/voice/status")
def voice_status():
    """Which characters have a voice configured. Booleans only — no key
    material and no voice IDs ever leave the backend."""
    return {
        "configured": bool(os.getenv("ELEVENLABS_API_KEY")),
        "model": MODEL,
        "characters": {c: bool(voice_id_for(c)) for c in CHARACTER_VOICE_ENV},
    }


@router.post("/voice/speak")
def speak(body: SpeakReq, user_id: str = Depends(require_user_id)):
    character = body.character.lower()
    if character not in CHARACTER_VOICE_ENV:
        raise HTTPException(status_code=400, detail=f"Unknown character: {body.character}")
    # Paywall: voice generation spends real money, so it is a subscriber (or
    # owner) benefit, not a free signed-in benefit — same gate as the tutor.
    if not is_subscribed(user_id):
        raise HTTPException(status_code=402, detail="Character voices require an active subscription.")
    check_rate(f"user:{user_id}")

    text = body.text.strip()
    key = cache_key(character, text)
    cached_audio = _cache_read(key)
    if cached_audio is not None:
        _log_call(user_id, character, len(text), cached=True, error=False)
        import base64

        return {
            "character": character,
            "text": text,
            "audio_b64": base64.b64encode(cached_audio).decode(),
            "mime": "audio/mpeg",
            "cached": True,
            "fallback": False,
        }

    voice_id = voice_id_for(character)
    provider = get_provider()
    if provider is None or voice_id is None:
        # No key or no voice ID yet (Spencer supplies both himself, portal
        # -> server env file). Text-only fallback: the frontend shows the
        # subtitles and Cypher still animates; nothing here is an error.
        _log_call(user_id, character, len(text), cached=False, error=False)
        return {
            "character": character,
            "text": text,
            "audio_b64": None,
            "mime": None,
            "cached": False,
            "fallback": True,
            "reason": "voice_not_configured",
        }

    try:
        audio = provider.synthesize(voice_id, text)
    except Exception:
        # Upstream failure degrades to the same text-only fallback — a
        # voice outage must never 500 the lesson or the mission.
        log.warning("ElevenLabs synthesis failed for character %s", character, exc_info=True)
        _log_call(user_id, character, len(text), cached=False, error=True)
        return {
            "character": character,
            "text": text,
            "audio_b64": None,
            "mime": None,
            "cached": False,
            "fallback": True,
            "reason": "voice_unavailable",
        }

    _cache_write(key, audio)
    _log_call(user_id, character, len(text), cached=False, error=False)
    import base64

    return {
        "character": character,
        "text": text,
        "audio_b64": base64.b64encode(audio).decode(),
        "mime": "audio/mpeg",
        "cached": False,
        "fallback": False,
    }
