"""Tests for the ElevenLabs character-voice service (backend/voice.py).

The provider is faked (no network, no key): the fake counts synthesis
calls, which is how the cache test proves a repeat never regenerates.
The fallback path (no key / no voice ID) is the production behaviour until
Spencer supplies ELEVENLABS_API_KEY + CYPHER_VOICE_ID himself.
"""
import base64
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

import db
import main
import voice
from auth.sessions import COOKIE_NAME, create_session
from db_models import Subscription, User, VoiceCall

client = TestClient(main.app)

FAKE_AUDIO = b"fake-mp3-bytes-for-tests"


class FakeProvider:
    def __init__(self, error=None, audio=None):
        self.calls = []
        self.error = error
        # audio: optional callable(text) -> bytes, so a test can tell
        # chunks apart in the response. Defaults to the same bytes.
        self.audio = audio

    def synthesize(self, voice_id, text):
        self.calls.append((voice_id, text))
        if self.error is not None:
            raise self.error
        return self.audio(text) if self.audio is not None else FAKE_AUDIO


@pytest.fixture(autouse=True)
def _clean(monkeypatch, tmp_path):
    """Fresh DB, fresh rate-limit bucket, and a throwaway voice cache dir
    per test so cache assertions never leak between tests."""
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    voice._hits.clear()
    monkeypatch.setattr(voice, "CACHE_DIR", tmp_path / "voice-cache")
    yield
    client.cookies.clear()


def _signed_in_user(user_id, email, subscribed=True):
    with db.SessionLocal() as s:
        if s.get(User, user_id) is None:
            s.add(User(id=user_id, display_name=user_id, email=email))
            s.flush()
        if subscribed:
            s.merge(Subscription(user_id=user_id, stripe_customer_id="cus_test", status="active"))
        raw = create_session(s, user_id)
        s.commit()
    client.cookies.set(COOKIE_NAME, raw)
    return user_id


def _voice_calls(user_id="voice-test"):
    with db.SessionLocal() as s:
        return s.query(VoiceCall).filter(VoiceCall.user_id == user_id).all()


def test_speak_requires_sign_in():
    client.cookies.clear()
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "Hello"})
    assert r.status_code == 401


def test_speak_free_user_is_402(monkeypatch):
    monkeypatch.setattr(voice, "get_provider", lambda: FakeProvider())
    _signed_in_user("free-test", "free@example.com", subscribed=False)
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "Hello"})
    assert r.status_code == 402


def test_speak_unknown_character(monkeypatch):
    monkeypatch.setattr(voice, "get_provider", lambda: FakeProvider())
    _signed_in_user("voice-test", "v@example.com")
    r = client.post("/api/voice/speak", json={"character": "r2d2", "text": "Hello"})
    assert r.status_code == 400


def test_fallback_when_not_configured(monkeypatch):
    """No key and no voice ID -> HTTP 200 text-only fallback, never a 500,
    and no key material anywhere in the response."""
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.delenv("CYPHER_VOICE_ID", raising=False)
    monkeypatch.setattr(voice, "get_provider", lambda: None)
    _signed_in_user("voice-test", "v@example.com")
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "Hello, agent."})
    assert r.status_code == 200
    body = r.json()
    assert body["fallback"] is True
    assert body["audio_b64"] is None
    assert body["reason"] == "voice_not_configured"
    assert body["text"] == "Hello, agent."
    assert "ELEVENLABS_API_KEY" not in r.text
    assert "CYPHER_VOICE_ID" not in r.text
    rows = _voice_calls()
    assert len(rows) == 1 and rows[0].cached is False and rows[0].error is False
    assert rows[0].chars == len("Hello, agent.")


def test_speak_with_provider_and_cache_hit(monkeypatch):
    """First call synthesizes; the identical second call is a cache hit and
    the provider is not called again."""
    fake = FakeProvider()
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    _signed_in_user("voice-test", "v@example.com")
    body = {"character": "cypher", "text": "Welcome to the SOC."}
    r1 = client.post("/api/voice/speak", json=body)
    assert r1.status_code == 200
    assert r1.json()["fallback"] is False
    assert r1.json()["cached"] is False
    assert base64.b64decode(r1.json()["audio_b64"]) == FAKE_AUDIO
    assert len(fake.calls) == 1
    assert fake.calls[0][0] == "voice-cypher-test"

    r2 = client.post("/api/voice/speak", json=body)
    assert r2.status_code == 200
    assert r2.json()["cached"] is True
    assert base64.b64decode(r2.json()["audio_b64"]) == FAKE_AUDIO
    assert len(fake.calls) == 1  # no second generation

    rows = _voice_calls()
    assert len(rows) == 2
    assert rows[0].cached is False and rows[1].cached is True
    assert all(row.cost_usd is None for row in rows)  # unknown, never invented


def test_provider_failure_falls_back(monkeypatch):
    fake = FakeProvider(error=RuntimeError("upstream down"))
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    _signed_in_user("voice-test", "v@example.com")
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "Hello"})
    assert r.status_code == 200
    assert r.json()["fallback"] is True
    assert r.json()["reason"] == "voice_unavailable"
    rows = _voice_calls()
    assert len(rows) == 1 and rows[0].error is True


def test_rate_limit(monkeypatch):
    fake = FakeProvider()
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    monkeypatch.setattr(voice, "RATE_LIMIT", 2)
    _signed_in_user("voice-test", "v@example.com")
    body = {"character": "cypher", "text": "Hello"}
    assert client.post("/api/voice/speak", json=body).status_code == 200
    assert client.post("/api/voice/speak", json={**body, "text": "Hello again"}).status_code == 200
    r = client.post("/api/voice/speak", json={**body, "text": "Third"})
    assert r.status_code == 429


def test_cached_audio_does_not_count_against_the_rate_limit(monkeypatch):
    """The limit guards ElevenLabs spend: replaying already-spoken audio is
    served past the limit; new text is still limited."""
    fake = FakeProvider()
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    monkeypatch.setattr(voice, "RATE_LIMIT", 2)
    _signed_in_user("voice-test", "v@example.com")
    body = {"character": "cypher", "text": "Hello"}
    assert client.post("/api/voice/speak", json=body).status_code == 200  # synthesizes (1 of 2)
    for _ in range(5):
        r = client.post("/api/voice/speak", json=body)
        assert r.status_code == 200 and r.json()["cached"] is True
    assert len(fake.calls) == 1
    assert client.post("/api/voice/speak", json={**body, "text": "Second"}).status_code == 200
    assert client.post("/api/voice/speak", json={**body, "text": "Third"}).status_code == 429
    assert client.post("/api/voice/speak", json=body).status_code == 200  # cached still plays


def test_status_reports_booleans_only(monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.delenv("CYPHER_VOICE_ID", raising=False)
    monkeypatch.delenv("SENTINEL_VOICE_ID", raising=False)
    monkeypatch.delenv("PATCH_VOICE_ID", raising=False)
    r = client.get("/api/voice/status")
    assert r.status_code == 200
    body = r.json()
    assert body["configured"] is False
    assert body["characters"] == {"cypher": False, "sentinel": False, "patch": False}
    assert "ELEVENLABS_API_KEY" not in r.text
    assert "voice-" not in r.text  # no voice IDs leak


def test_speak_text_too_long(monkeypatch):
    monkeypatch.setattr(voice, "get_provider", lambda: FakeProvider())
    _signed_in_user("voice-test", "v@example.com")
    # The cap is ElevenLabs' own per-request limit (5,000 characters), not
    # the old 2,000: a full lesson answer is ~3,600 characters.
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "x" * 5001})
    assert r.status_code == 422


def _long_text(sentences=8, words_per_sentence=60):
    """A multi-sentence text of ~2,400 characters: longer than the old
    2,000-character request cap, so it must be chunked, not rejected.
    Sentences are numbered so no two chunks are the same string."""
    return " ".join(
        f"Sentence {i} " + " ".join(["word"] * words_per_sentence) + "."
        for i in range(sentences)
    )


def test_split_into_chunks_sentence_boundaries():
    text = "First sentence here. Second sentence follows. " + "x" * 1500 + ". Last one."
    chunks = voice.split_into_chunks(text)
    assert len(chunks) == 3
    assert all(len(c) <= voice.MAX_CHUNK_CHARS for c in chunks)
    # Whole sentences stay whole: the first chunk ends at a sentence end.
    assert chunks[0] == "First sentence here. Second sentence follows."
    # No characters lost or duplicated by the split.
    assert "".join(chunks).replace(" ", "") == text.replace(" ", "")
    # A short text is a single chunk.
    assert voice.split_into_chunks("Hello there.") == ["Hello there."]


def test_long_text_is_chunked_and_segments_are_ordered(monkeypatch):
    """A long answer is synthesized chunk by chunk (one provider call per
    chunk), and the response carries the segments in order plus the
    concatenated bytes — the fix for lesson answers that outgrew a single
    ElevenLabs request."""
    fake = FakeProvider(audio=lambda t: ("audio:" + t[:20]).encode())
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    _signed_in_user("voice-test", "v@example.com")
    text = _long_text()
    assert len(text) > 2000  # past the old request cap
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": text})
    assert r.status_code == 200
    body = r.json()
    assert body["fallback"] is False
    assert body["cached"] is False
    chunks = voice.split_into_chunks(text)
    assert len(chunks) > 1
    # One synthesis per chunk (order across parallel calls is not
    # observable, so compare as a set); together they are the whole text.
    assert sorted(c for _, c in fake.calls) == sorted(chunks)
    assert " ".join(chunks) == text
    # Segments in order, each the audio for its chunk; audio_b64 is the
    # concatenation for single-file consumers.
    assert [base64.b64decode(s) for s in body["audio_segments"]] == [
        ("audio:" + c[:20]).encode() for c in chunks
    ]
    assert base64.b64decode(body["audio_b64"]) == b"".join(
        ("audio:" + c[:20]).encode() for c in chunks
    )


def test_chunked_audio_is_cached_per_chunk(monkeypatch):
    """Repeating a long answer synthesizes nothing: every chunk is a cache
    hit, and the response is flagged cached."""
    fake = FakeProvider()
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    _signed_in_user("voice-test", "v@example.com")
    body = {"character": "cypher", "text": _long_text()}
    r1 = client.post("/api/voice/speak", json=body)
    assert r1.json()["cached"] is False
    calls_after_first = len(fake.calls)
    assert calls_after_first > 1

    r2 = client.post("/api/voice/speak", json=body)
    assert r2.status_code == 200
    assert r2.json()["cached"] is True
    assert len(fake.calls) == calls_after_first  # no second generation
    assert r2.json()["audio_segments"] == r1.json()["audio_segments"]


def test_shared_chunk_is_reused(monkeypatch):
    """The cache is per chunk, not per answer: a longer answer sharing its
    first chunks with an already-spoken one synthesizes only the new
    chunk."""
    fake = FakeProvider()
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    _signed_in_user("voice-test", "v@example.com")
    first = _long_text(sentences=8)
    assert client.post("/api/voice/speak", json={"character": "cypher", "text": first}).status_code == 200
    calls_after_first = len(fake.calls)

    longer = _long_text(sentences=11)
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": longer})
    assert r.status_code == 200
    assert r.json()["cached"] is False  # not a full hit: new chunk(s) exist
    # Only the chunks the first answer did not already have are synthesized.
    first_chunks = set(voice.split_into_chunks(first))
    longer_chunks = voice.split_into_chunks(longer)
    new_chunks = [c for c in longer_chunks if c not in first_chunks]
    assert len(fake.calls) == calls_after_first + len(new_chunks)
    assert len(new_chunks) > 0


# ---------- Markdown -> speakable text (live defect: the voice read "###"
# and "**" aloud, garbled, in the 2026-11-13 browser test) ----------

def test_strip_markdown_headings_bold_bullets():
    cleaned = voice.strip_markdown_to_speech(
        "### Reasons for Implicit Deny\n"
        "**Security** — any traffic not explicitly permitted is denied.\n"
        "- Management: concise rules.\n"
        "1. First step\n"
        "2. Second step\n"
    )
    assert "###" not in cleaned and "**" not in cleaned
    assert cleaned.startswith("Reasons for Implicit Deny.")
    assert "Security — any traffic not explicitly permitted is denied." in cleaned
    assert "Management: concise rules." in cleaned
    assert "First step." in cleaned and "Second step." in cleaned


def test_strip_markdown_links_code_and_urls():
    cleaned = voice.strip_markdown_to_speech(
        "Run `objectives` in the [Mission Console](https://example.com/missions) "
        "or see https://example.com/docs for details.\n"
        "> A quoted line stays as words.\n"
        "Use *italics* and _emphasis_ sparingly."
    )
    assert "`" not in cleaned and "[" not in cleaned and "https://" not in cleaned
    assert "Run objectives in the Mission Console or see" in cleaned
    assert "A quoted line stays as words." in cleaned
    assert "Use italics and emphasis sparingly." in cleaned


def test_strip_markdown_drops_code_blocks():
    cleaned = voice.strip_markdown_to_speech(
        "Here is the rule:\n```\naccess-list 10 deny any\n```\nThat blocks the guest."
    )
    assert "access-list" not in cleaned
    assert cleaned == "Here is the rule: That blocks the guest."


def test_strip_markdown_empty_when_nothing_speakable():
    assert voice.strip_markdown_to_speech("```\nonly code\n```") == ""
    assert voice.strip_markdown_to_speech("   \n---\n  ") == ""


def test_speak_sends_cleaned_text_to_provider(monkeypatch):
    """The provider (ElevenLabs) receives the cleaned text, never raw
    Markdown — and the envelope returns the cleaned text for subtitles."""
    fake = FakeProvider()
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    _signed_in_user("voice-test", "v@example.com")
    r = client.post(
        "/api/voice/speak",
        json={"character": "cypher", "text": "### Reasons for Implicit Deny\n**Security** wins."},
    )
    assert r.status_code == 200
    assert len(fake.calls) == 1
    assert fake.calls[0][1] == "Reasons for Implicit Deny. Security wins."
    assert "###" not in r.json()["text"] and "**" not in r.json()["text"]
    assert r.json()["text"] == "Reasons for Implicit Deny. Security wins."


def test_speak_cache_key_is_on_cleaned_text(monkeypatch):
    """Two differently-marked wordings of the same words clean identically,
    so the second is a cache hit and the provider is not called again."""
    fake = FakeProvider()
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    _signed_in_user("voice-test", "v@example.com")
    r1 = client.post("/api/voice/speak", json={"character": "cypher", "text": "## Hello there"})
    assert r1.json()["cached"] is False
    r2 = client.post("/api/voice/speak", json={"character": "cypher", "text": "**Hello there**"})
    assert r2.status_code == 200
    assert r2.json()["cached"] is True
    assert len(fake.calls) == 1


# ---------- credit reserve for mission briefings ----------

class BalanceProvider(FakeProvider):
    """A fake that also reports the account's remaining credits."""

    def __init__(self, credits, **kw):
        super().__init__(**kw)
        self.credits = credits
        self.balance_reads = 0

    def remaining_credits(self):
        self.balance_reads += 1
        return self.credits


@pytest.fixture
def reserve(monkeypatch):
    monkeypatch.setattr(voice, "LESSON_RESERVE_CREDITS", 100)
    monkeypatch.setitem(voice._credits, "value", None)
    monkeypatch.setitem(voice._credits, "at", None)
    monkeypatch.setenv("CYPHER_VOICE_ID", "voice-cypher-test")
    monkeypatch.setenv("SENTINEL_VOICE_ID", "voice-sentinel-test")
    _signed_in_user("voice-test", "v@example.com")


def test_lesson_voice_is_held_back_below_the_reserve(monkeypatch, reserve):
    fake = BalanceProvider(credits=120)
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    # 30 chars would leave 90 < 100: the lesson gets text, nothing is synthesized.
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "x" * 30})
    assert r.status_code == 200
    assert r.json()["fallback"] is True
    assert r.json()["reason"] == "voice_budget_reserved"
    assert fake.calls == []


def test_briefing_may_spend_the_reserve(monkeypatch, reserve):
    fake = BalanceProvider(credits=120)
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    r = client.post("/api/voice/speak", json={"character": "sentinel", "text": "x" * 30, "purpose": "briefing"})
    assert r.json()["fallback"] is False
    assert len(fake.calls) == 1
    assert fake.balance_reads == 0  # briefings never wait on a balance read


def test_lesson_voice_plays_above_the_reserve_and_spend_is_tracked(monkeypatch, reserve):
    fake = BalanceProvider(credits=200)
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    assert client.post("/api/voice/speak", json={"character": "cypher", "text": "a" * 60}).json()["fallback"] is False
    # 200 - 60 = 140 left locally (balance not re-read inside the TTL), so
    # another 60 would leave 80 < 100 and is held back.
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "b" * 60})
    assert r.json()["reason"] == "voice_budget_reserved"
    assert fake.balance_reads == 1


def test_cached_lesson_audio_still_plays_below_the_reserve(monkeypatch, reserve):
    fake = BalanceProvider(credits=10_000)
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    client.post("/api/voice/speak", json={"character": "cypher", "text": "Hello there."})
    fake.credits = 0
    monkeypatch.setitem(voice._credits, "at", None)  # force a re-read
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "Hello there."})
    assert r.json()["fallback"] is False and r.json()["cached"] is True


def test_unknown_balance_never_blocks(monkeypatch, reserve):
    fake = BalanceProvider(credits=None)
    monkeypatch.setattr(voice, "get_provider", lambda: fake)
    assert client.post("/api/voice/speak", json={"character": "cypher", "text": "Hi."}).json()["fallback"] is False


def test_unknown_purpose_is_400(monkeypatch, reserve):
    monkeypatch.setattr(voice, "get_provider", lambda: FakeProvider())
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "Hi.", "purpose": "ads"})
    assert r.status_code == 400
