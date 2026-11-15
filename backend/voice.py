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
  repeats (mission briefings are reused constantly). Long answers are
  split into sentence-boundary chunks (see split_into_chunks) and each
  chunk is synthesized — and cached — separately, so a whole lesson
  answer speaks instead of hitting one request's character limit or the
  call timeout; the response carries the chunks in order (audio_segments)
  plus the concatenated bytes (audio_b64) for single-file consumers.
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
import re
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
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
#: Longest text one /voice/speak request accepts. This is ElevenLabs' own
#: per-request limit (5,000 characters), not ours: a full lesson answer
#: can be ~3,600 characters, and it is split into synthesis chunks below,
#: so the request cap must admit the whole answer. Was 2,000 — a 900-token
#: tutor answer would have been rejected with 422 at the speak step.
MAX_TEXT_CHARS = 5000

#: Longest text in one synthesis chunk. A ~1,400-character answer took
#: ~25 s to synthesize live, against the provider call's 30 s timeout, so
#: a chunk of 1,000 stays comfortably inside it while keeping the number
#: of chunks (and requests) small: a 900-token answer is ~4 chunks.
MAX_CHUNK_CHARS = 1000

#: Max synthesis requests in flight for one answer. Chunks are synthesized
#: in parallel so a 4-chunk answer waits ~25 s, not ~4 x 25 s; 3 bounds
#: the concurrent load on the provider.
MAX_CHUNK_WORKERS = 3

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


def split_into_chunks(text: str) -> list[str]:
    """Split speakable text into synthesis chunks of at most
    MAX_CHUNK_CHARS, at sentence boundaries.

    One ElevenLabs request per chunk: a whole long answer in one request
    would exceed the provider's per-request limit and the 30 s call
    timeout, so the answer is spoken chunk by chunk and the frontend plays
    the chunks in order. Joining the chunks with a single space reproduces
    the input (modulo whitespace), so no words are lost or reordered.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: list[str] = []
    current = ""

    def flush() -> None:
        nonlocal current
        if current:
            chunks.append(current)
            current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) > MAX_CHUNK_CHARS:
            # One over-long sentence (a URL, a run-on): flush what precedes
            # it, then hard-split it at the cap, preferring a word boundary
            # over a mid-word cut.
            flush()
            while len(sentence) > MAX_CHUNK_CHARS:
                cut = sentence.rfind(" ", 0, MAX_CHUNK_CHARS)
                cut = cut if cut > 0 else MAX_CHUNK_CHARS
                chunks.append(sentence[:cut].strip())
                sentence = sentence[cut:].strip()
            current = sentence
            continue
        if current and len(current) + 1 + len(sentence) > MAX_CHUNK_CHARS:
            flush()
        current = f"{current} {sentence}" if current else sentence
    flush()
    return chunks or [text]


# ---------- Markdown -> speakable plain text ----------

# Tutor answers are Markdown, but the voice must never read the markup
# aloud: in the live test "### Reasons for Implicit Deny" came out as
# garbled words at exactly the Markdown markers. Every spoken text passes
# through strip_markdown_to_speech() before synthesis (and before the
# cache key, so the key is on the cleaned text). Code blocks are dropped
# entirely — code is shown on screen, never spoken. Inline code, links
# and emphasis collapse to the words a teacher would say.
_FENCE_RE = re.compile(r"^\s*```")
_HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+")
_BULLET_RE = re.compile(r"^\s*[-*+]\s+")
_ORDERED_RE = re.compile(r"^\s*\d+[.)]\s+")
_BLOCKQUOTE_RE = re.compile(r"^\s*>\s?")
_HR_RE = re.compile(r"^\s*([-*_])(\s*\1){2,}\s*$")
_HTML_RE = re.compile(r"<[^>]+>")
_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")
_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_BARE_URL_RE = re.compile(r"https?://\S+")
_CODE_SPAN_RE = re.compile(r"`([^`]*)`")
_BOLD_RE = re.compile(r"(\*\*|__)(.+?)\1")
_ITALIC_RE = re.compile(r"(?<!\w)(\*|_)([^*_]+?)\1(?!\w)")


def strip_markdown_to_speech(text: str) -> str:
    """Collapse Markdown to clean, speakable plain text.

    Headings, bullets and numbered items become sentences (a full stop is
    added where the line has no terminal punctuation, so the voice pauses);
    bold/italic markers, links, bare URLs, HTML tags and inline code are
    removed, keeping the words. Returns '' only when nothing speakable
    remains (e.g. the input was a lone code block) — callers fall back to
    the original text in that case.
    """
    lines = []
    in_fence = False
    for raw in text.splitlines():
        line = raw.strip()
        if _FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence or not line or _HR_RE.match(line):
            continue
        line = _HEADING_RE.sub("", line)
        line = _BULLET_RE.sub("", line)
        line = _ORDERED_RE.sub("", line)
        line = _BLOCKQUOTE_RE.sub("", line)
        line = _IMAGE_RE.sub(r"\1", line)
        line = _LINK_RE.sub(r"\1", line)
        line = _BARE_URL_RE.sub("", line)
        line = _HTML_RE.sub("", line)
        line = _CODE_SPAN_RE.sub(r"\1", line)
        line = _BOLD_RE.sub(r"\2", line)
        line = _ITALIC_RE.sub(r"\2", line)
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        # A line with no terminal punctuation is a heading or list item:
        # end it as a sentence so the voice pauses before the next one.
        if line[-1].isalnum():
            line += "."
        lines.append(line)
    return " ".join(lines)


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


def _synthesize_missing(provider, voice_id: str, character: str, chunks: list[str], cached_audios: list) -> list[bytes]:
    """Synthesize the chunks the cache did not have, in parallel.

    Returns the audio bytes per chunk, in order. A failure in any chunk
    raises, so the caller degrades to the text-only fallback instead of
    serving partial audio. Chunks that were already cached are never
    re-synthesized, and a chunk synthesized here is cached before
    returning, so a retry after a partial failure is cheap.
    """
    audios: list = list(cached_audios)

    def _one(index: int) -> None:
        chunk = chunks[index]
        audio = provider.synthesize(voice_id, chunk)
        _cache_write(cache_key(character, chunk), audio)
        audios[index] = audio

    missing = [i for i, a in enumerate(audios) if a is None]
    if len(missing) == 1:
        _one(missing[0])
    elif missing:
        with ThreadPoolExecutor(max_workers=min(MAX_CHUNK_WORKERS, len(missing))) as pool:
            futures = [pool.submit(_one, i) for i in missing]
            for f in futures:
                f.result()  # raises the first chunk failure to the caller
    return [a for a in audios if a is not None]


def _audio_envelope(character: str, speakable: str, audios: list[bytes], cached: bool) -> dict:
    """The success envelope for synthesized audio: the chunks in order for
    the frontend to play sequentially, plus the concatenated bytes for any
    consumer that plays a single file."""
    import base64

    return {
        "character": character,
        "text": speakable,
        "audio_b64": base64.b64encode(b"".join(audios)).decode(),
        "audio_segments": [base64.b64encode(a).decode() for a in audios],
        "mime": "audio/mpeg",
        "cached": cached,
        "fallback": False,
    }


def _fallback_envelope(character: str, speakable: str, reason: str) -> dict:
    return {
        "character": character,
        "text": speakable,
        "audio_b64": None,
        "audio_segments": [],
        "mime": None,
        "cached": False,
        "fallback": True,
        "reason": reason,
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
    # The single chokepoint: every spoken text is stripped to clean,
    # speakable plain text before synthesis, caching and logging — the
    # voice never reads Markdown markers aloud. The cache key is on the
    # cleaned text, so differently-marked repeats of the same words hit.
    # An input that strips to nothing (a lone code block) falls back to
    # the original text rather than synthesising silence.
    speakable = strip_markdown_to_speech(text) or text
    # A long answer is spoken chunk by chunk (see split_into_chunks): one
    # ElevenLabs request per chunk, each inside the provider's character
    # limit and the 30 s call timeout. The cache is per chunk, so a repeat
    # — or a new answer sharing sentences with a spoken one — reuses audio.
    chunks = split_into_chunks(speakable)
    cached_audios = [_cache_read(cache_key(character, c)) for c in chunks]
    if all(a is not None for a in cached_audios):
        # Full hit: serve without a provider or a key, exactly as the old
        # whole-text cache did — a lesson already spoken once still speaks
        # after the key is rotated or removed.
        _log_call(user_id, character, len(speakable), cached=True, error=False)
        return _audio_envelope(character, speakable, cached_audios, cached=True)

    voice_id = voice_id_for(character)
    provider = get_provider()
    if provider is None or voice_id is None:
        # No key or no voice ID yet (Spencer supplies both himself, portal
        # -> server env file). Text-only fallback: the frontend shows the
        # subtitles and Cypher still animates; nothing here is an error.
        _log_call(user_id, character, len(speakable), cached=False, error=False)
        return _fallback_envelope(character, speakable, "voice_not_configured")

    try:
        audios = _synthesize_missing(provider, voice_id, character, chunks, cached_audios)
    except Exception:
        # Upstream failure degrades to the same text-only fallback — a
        # voice outage must never 500 the lesson or the mission.
        log.warning("ElevenLabs synthesis failed for character %s", character, exc_info=True)
        _log_call(user_id, character, len(speakable), cached=False, error=True)
        return _fallback_envelope(character, speakable, "voice_unavailable")

    _log_call(user_id, character, len(speakable), cached=False, error=False)
    return _audio_envelope(character, speakable, audios, cached=False)
