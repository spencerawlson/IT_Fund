"""Tests for the entitled content API (backend/content.py, P0-1 remediation).

The paywall is enforced server-side: premium lesson bodies, card answers,
module notes and exam questions are served here only after an entitlement
check. These tests prove the boundary with the real dataset
(backend/data/content.json) — anonymous 401s, signed-in free 402s, subscriber
200s — and that the server-side exam builder matches the JS builders it
replaces (quotas, sampling, pool composition).
"""
import os
import sys
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient  # noqa: E402

import content as content_mod  # noqa: E402
import db  # noqa: E402
import main  # noqa: E402
from auth.identity import OAuthIdentity, upsert_identity  # noqa: E402
from auth.sessions import COOKIE_NAME, create_session  # noqa: E402
from db_models import Subscription  # noqa: E402

client = TestClient(main.app)

# Audit canary set (deliverable 03, F-01): verbatim premium strings.
CANARIES = [
    "Bell-LaPadula enforces confidentiality",
    "Treat it as likely C2 beaconing",
    "A control should never cost more than the value of the asset it protects",
    "What is the goal of a Business Continuity Plan",
    "four canons of the ISC2 Code of Ethics",
    "NetFlow shows a workstation opening an HTTPS connection",
]

#: Decks that remain CISSP D8-primary and are genuinely SDLC-security content
#: (audit F-04 post-fix state, ported from src/lib/academy.pool-audit.test.js).
SDLC_SECURITY_D8_DECKS = {
    "cissp-d8", "cissp-cap-d8", "cy-web", "ai-security", "cpp-safety",
    "rust-ownership", "rust-concurrency", "docker-optimization-security",
    "k8s-security", "sec-ai-apps",
}


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    content_mod._hits.clear()


def _signed_in(sub="u1", email="u1@example.com"):
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("google", sub, email, True, "U"))
        raw = create_session(s, user.id)
        s.commit()
        uid = user.id
    return {COOKIE_NAME: raw}, uid


def _set_sub(uid, status="active", customer="cus_test_1"):
    with db.SessionLocal() as s:
        s.merge(
            Subscription(
                user_id=uid,
                stripe_customer_id=customer,
                stripe_subscription_id="sub_test_1",
                status=status,
                current_period_end=None,
            )
        )
        s.commit()


def _subscriber():
    cookies, uid = _signed_in()
    _set_sub(uid, "active")
    return cookies, uid


# ---------- catalog (public structure, no bodies) ----------


def test_catalog_anonymous_has_no_premium_bodies():
    r = client.get("/api/content/catalog")
    assert r.status_code == 200
    body = r.text
    for canary in CANARIES:
        assert canary not in body
    data = r.json()
    assert data["counts"] == {"decks": 222, "cards": 3145, "lessons": 222, "notes": 426}
    assert data["freeDecks"] == ["net-osi", "cy-linux", "py-basics", "lx-cli", "cl-concepts"]
    assert data["freeLessons"] == ["net-osi", "sec-concepts", "py-basics", "lx-cli", "cl-concepts"]
    # Structure is complete (ids + counts) but premium decks carry stubs only.
    decks = [d for t in data["tracks"] for tier in t["tiers"] for d in tier["decks"]]
    assert len(decks) == 222
    premium = [d for d in decks if d["id"] not in data["freeDecks"]]
    assert all("q" not in c for d in premium for c in d["cards"])
    assert all(len(d["cards"]) > 0 for d in premium)  # ids + count still present
    free = [d for d in decks if d["id"] in data["freeDecks"]]
    assert sum(len(d["cards"]) for d in free) == 57


# ---------- decks ----------


def test_free_deck_is_public_anonymous():
    r = client.get("/api/content/deck/net-osi")
    assert r.status_code == 200
    data = r.json()
    assert data["deck"]["id"] == "net-osi"
    assert len(data["cards"]) == 12
    assert all(c["q"] and c["a"] for c in data["cards"])
    assert len(data["puzzles"]) == 2  # free deck keeps its puzzles


def test_premium_deck_anonymous_401_free_user_402_subscriber_200():
    r = client.get("/api/content/deck/sec-threats")
    assert r.status_code == 401
    cookies, _ = _signed_in()
    r = client.get("/api/content/deck/sec-threats", cookies=cookies)
    assert r.status_code == 402
    cookies, _ = _subscriber()
    r = client.get("/api/content/deck/sec-threats", cookies=cookies)
    assert r.status_code == 200
    data = r.json()
    assert len(data["cards"]) == 12
    assert all(c["q"] and c["a"] and len(c["wrong"]) == 3 for c in data["cards"])


def test_unknown_deck_404():
    assert client.get("/api/content/deck/no-such-deck").status_code == 404


# ---------- lessons ----------


def test_free_lesson_is_public_anonymous():
    r = client.get("/api/content/lesson/net-osi")
    assert r.status_code == 200
    data = r.json()
    assert len(data["content"]["overview"]) >= 1
    assert len(data["content"]["learn"]) >= 2
    assert data["cipherNote"]  # net-osi has a free cipher note


def test_newly_free_lessons_are_public_anonymous():
    # Free-tier unification (2026-11-11): lx-cli and cl-concepts joined the
    # free lessons; they must be readable without signing in.
    for lesson_id in ("lx-cli", "cl-concepts"):
        r = client.get(f"/api/content/lesson/{lesson_id}")
        assert r.status_code == 200, lesson_id
        assert len(r.json()["content"]["learn"]) >= 2


def test_premium_lesson_gating_and_canary():
    r = client.get("/api/content/lesson/cissp-d3")
    assert r.status_code == 401
    cookies, _ = _signed_in()
    r = client.get("/api/content/lesson/cissp-d3", cookies=cookies)
    assert r.status_code == 402
    cookies, _ = _subscriber()
    r = client.get("/api/content/lesson/cissp-d3", cookies=cookies)
    assert r.status_code == 200
    # The premium body is really served (not an empty shell).
    assert "Bell-LaPadula enforces confidentiality" in r.text


def test_premium_cipher_note_travels_with_the_lesson():
    cookies, _ = _subscriber()
    r = client.get("/api/content/lesson/net-switch-route", cookies=cookies)
    assert r.status_code == 200
    assert r.json()["cipherNote"] == (
        "Longest prefix match is decided before administrative distance — "
        "a /24 beats a /16 even from a more trusted source."
    )


def test_unknown_lesson_404():
    assert client.get("/api/content/lesson/no-such-lesson").status_code == 404


# ---------- notes ----------


def test_note_is_subscriber_only():
    r = client.get("/api/content/note/m2-1")
    assert r.status_code == 401
    cookies, _ = _signed_in()
    r = client.get("/api/content/note/m2-1", cookies=cookies)
    assert r.status_code == 402
    cookies, _ = _subscriber()
    r = client.get("/api/content/note/m2-1", cookies=cookies)
    assert r.status_code == 200
    assert "Hardware is every physical component you can touch" in r.json()["body"]


def test_unknown_note_404():
    cookies, _ = _subscriber()
    assert client.get("/api/content/note/no-such-note", cookies=cookies).status_code == 404


# ---------- exams ----------


def test_exam_requires_subscription():
    r = client.get("/api/content/exam/cissp")
    assert r.status_code == 401
    cookies, _ = _signed_in()
    r = client.get("/api/content/exam/cissp", cookies=cookies)
    assert r.status_code == 402


def test_exam_unknown_cert_404():
    cookies, _ = _subscriber()
    assert client.get("/api/content/exam/nope", cookies=cookies).status_code == 404


def test_exam_shape_and_quotas_all_certs():
    cookies, _ = _subscriber()
    for cert_id, count in [
        ("cissp", 100), ("secplus", 90), ("aws-saa", 65), ("cysa", 85), ("aws-security", 65),
    ]:
        for _ in range(3):  # three builds, like the JS pool-audit test
            r = client.get(f"/api/content/exam/{cert_id}", cookies=cookies)
            assert r.status_code == 200
            data = r.json()
            assert data["shortfalls"] == []
            assert sum(data["quotas"].values()) == count
            assert len(data["questions"]) == count
            for q in data["questions"]:
                assert len(q["options"]) == 4
                assert 0 <= q["correct"] < 4
                assert q["card"]["q"] and q["card"]["a"]
                assert "wrong" not in q["card"]  # options already built server-side


def test_exam_count_clamped_to_cert_default():
    cookies, _ = _subscriber()
    r = client.get("/api/content/exam/cissp?count=500", cookies=cookies)
    assert len(r.json()["questions"]) == 100
    r = client.get("/api/content/exam/cissp?count=10", cookies=cookies)
    assert len(r.json()["questions"]) == 10


def test_owner_bypass_gets_premium_without_subscription(monkeypatch):
    monkeypatch.setenv("BILLING_OWNER_EMAILS", "owner@example.com")
    cookies, _ = _signed_in(sub="owner1", email="owner@example.com")
    r = client.get("/api/content/deck/sec-threats", cookies=cookies)
    assert r.status_code == 200
    r = client.get("/api/content/exam/cissp", cookies=cookies)
    assert r.status_code == 200


def test_rate_limit_429(monkeypatch):
    monkeypatch.setattr(content_mod, "RATE_LIMIT", 3)
    cookies, _ = _subscriber()
    for _ in range(3):
        assert client.get("/api/content/deck/net-osi", cookies=cookies).status_code == 200
    r = client.get("/api/content/deck/net-osi", cookies=cookies)
    assert r.status_code == 429
    assert "Retry-After" in r.headers


# ---------- exam builder: pool composition (ported from the JS pool-audit test) ----------


def _pools():
    data = content_mod.load_data()
    decks = {d["id"]: d for t in data["tracks"] for tier in t["tiers"] for d in tier["decks"]}
    cards = [c for d in decks.values() for c in d["cards"]]
    return data, decks, cards


def test_cissp_d8_pool_is_100_percent_sdlc_security():
    data, decks, cards = _pools()
    d8 = [c for c in cards if (decks[c["deckId"]].get("cissp") or [None])[0] == 8]
    assert len(d8) == 110
    assert {c["deckId"] for c in d8} <= SDLC_SECURITY_D8_DECKS


def test_cissp_d3_pool_shrunk_and_d6_grew():
    data, decks, cards = _pools()
    d3 = [c for c in cards if (decks[c["deckId"]].get("cissp") or [None])[0] == 3]
    d6 = [c for c in cards if (decks[c["deckId"]].get("cissp") or [None])[0] == 6]
    assert len(d3) == 361
    assert len(d6) >= 36


def test_secplus_pools_include_the_security_track():
    data, decks, cards = _pools()
    total = sum(1 for c in cards if (decks[c["deckId"]].get("secplus") or [None])[0])
    assert total == 1069
    sec_cards = [c for c in cards if c["deckId"].startswith("sec-")]
    assert len(sec_cards) > 100
    # Built exams actually draw Security+ track cards (audit: 8-10 per 90Q exam).
    for _ in range(3):
        exam = content_mod.build_exam(data, "secplus")
        drawn = {q["card"]["deckId"] for q in exam["questions"]}
        assert drawn & {c["deckId"] for c in sec_cards}


def test_domain_quotas_match_weights_and_sum():
    data = content_mod.load_data()
    for cert_id, (_, domain_key, count) in content_mod.CERTS.items():
        quotas = content_mod.domain_quotas(data["domains"][domain_key], count)
        assert sum(quotas.values()) == count
    cissp = content_mod.domain_quotas(data["domains"]["cissp"], 100)
    assert cissp == {d["id"]: d["weight"] for d in data["domains"]["cissp"]}
