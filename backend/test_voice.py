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
    def __init__(self, error=None):
        self.calls = []
        self.error = error

    def synthesize(self, voice_id, text):
        self.calls.append((voice_id, text))
        if self.error is not None:
            raise self.error
        return FAKE_AUDIO


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
    r = client.post("/api/voice/speak", json={"character": "cypher", "text": "x" * 2001})
    assert r.status_code == 422


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
