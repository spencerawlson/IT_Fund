"""Entitled content API: serves premium curriculum content only to subscribers.

The paywall is enforced HERE, server-side — the public JS bundle contains no
premium lesson bodies, card answers, or exam questions (see
scripts/export-content.mjs; the bundle carries only the free tier + structure).

Data source: backend/data/content.json, generated from the JS curriculum files
by `node scripts/export-content.mjs`. It is loaded once at import and cached in
memory (it is static per deploy; a redeploy picks up a regenerated file).

Endpoints (mounted on both /content/* and /api/content/*, like the other routers):
  GET /content/catalog            public structure (no bodies) — anyone
  GET /content/deck/{deck_id}     cards + puzzles for one deck
  GET /content/lesson/{lesson_id} reading body (+ cipher note) for one lesson
  GET /content/note/{key}         one module study note
  GET /content/exam/{cert_id}     a freshly built timed exam (server-side pool)

Gating (same semantics as the AI tutor, backend/ai_tutor.py):
  - free deck / free lesson: 200 for anyone, no sign-in needed.
  - premium deck / lesson / note / exam: anonymous -> 401, signed-in
    non-subscriber -> 402, subscriber or owner (BILLING_OWNER_EMAILS) -> 200.
  - unknown deck / lesson / note / cert -> 404.

Rate limiting: in-memory per-user (or per-IP when anonymous) deque, same shape
as the tutor's check_rate. Content reads are cheap, so the limit is generous
(300/min by default); it exists to blunt bulk scraping of the exam endpoint,
not to ration study. Env overrides: CONTENT_RATE_LIMIT / CONTENT_RATE_WINDOW.
"""
from __future__ import annotations

import json
import logging
import math
import os
import random
import time
from collections import deque
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from auth.deps import resolve_user_id
from billing import is_subscribed

log = logging.getLogger("content")

router = APIRouter(prefix="/content", tags=["content"])

_DATA_PATH = Path(__file__).with_name("data") / "content.json"

RATE_LIMIT = int(os.getenv("CONTENT_RATE_LIMIT", "300"))  # requests per window per key
RATE_WINDOW = int(os.getenv("CONTENT_RATE_WINDOW", "60"))  # seconds
_hits: dict[str, deque] = {}


def _check_rate(key: str, now: Optional[float] = None) -> None:
    now = now or time.time()
    q = _hits.setdefault(key, deque())
    while q and q[0] <= now - RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        retry = int(q[0] + RATE_WINDOW - now) + 1
        raise HTTPException(
            status_code=429,
            detail="Content limit reached. Try again later.",
            headers={"Retry-After": str(retry)},
        )
    q.append(now)


_data: dict | None = None


def load_data() -> dict:
    """Load (and cache) the content dataset. Raises RuntimeError when missing."""
    global _data
    if _data is None:
        if not _DATA_PATH.exists():
            raise RuntimeError(
                "content.json is missing — run `node scripts/export-content.mjs` "
                "to generate backend/data/content.json from the curriculum sources."
            )
        with open(_DATA_PATH, encoding="utf-8") as fh:
            _data = json.load(fh)
    return _data


def _deck_index(data: dict) -> dict[str, dict]:
    return {d["id"]: d for t in data["tracks"] for tier in t["tiers"] for d in tier["decks"]}


def _all_cards(data: dict) -> list[dict]:
    return [c for t in data["tracks"] for tier in t["tiers"] for d in tier["decks"] for c in d["cards"]]


def _public_tracks(data: dict) -> list[dict]:
    """Structure without premium bodies: premium decks keep ids/counts only."""
    free = set(data["freeDecks"])
    out = []
    for track in data["tracks"]:
        tiers = []
        for tier in track["tiers"]:
            decks = []
            for deck in tier["decks"]:
                if deck["id"] in free:
                    decks.append(deck)
                else:
                    decks.append(
                        {
                            **deck,
                            "puzzles": [],
                            "cards": [
                                {"id": c["id"], "deckId": c["deckId"], "trackId": c["trackId"]}
                                for c in deck["cards"]
                            ],
                        }
                    )
            tiers.append({**tier, "decks": decks})
        out.append({**track, "tiers": tiers})
    return out


def _rate_key(request: Request, user_id: str | None) -> str:
    if user_id:
        return f"user:{user_id}"
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


def _require_entitled(request: Request, free: bool) -> str | None:
    """Resolve the caller; raise 401 (anonymous) or 402 (signed-in, not
    subscribed) for premium content. Returns the user id or None."""
    user_id = resolve_user_id(request)
    if free:
        return user_id
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sign in to access this content.")
    if not is_subscribed(user_id):
        raise HTTPException(status_code=402, detail="This content requires an active subscription.")
    return user_id


def _json(content, status_code: int = 200, cache: str | None = None) -> JSONResponse:
    headers = {"Cache-Control": cache} if cache else {}
    return JSONResponse(content=content, status_code=status_code, headers=headers)


# ---------- read endpoints ----------


@router.get("/catalog")
def content_catalog(request: Request):
    data = load_data()
    _check_rate(_rate_key(request, resolve_user_id(request)))
    decks = _deck_index(data)
    return _json(
        {
            "tracks": _public_tracks(data),
            "domains": data["domains"],
            "freeDecks": data["freeDecks"],
            "freeLessons": data["freeLessons"],
            "counts": {
                "decks": len(decks),
                "cards": len(_all_cards(data)),
                "lessons": len(data["lessons"]),
                "notes": len(data["notes"]),
            },
        },
        cache="public, max-age=3600",
    )


@router.get("/deck/{deck_id}")
def content_deck(deck_id: str, request: Request):
    data = load_data()
    deck = _deck_index(data).get(deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Unknown deck.")
    user_id = _require_entitled(request, deck_id in data["freeDecks"])
    _check_rate(_rate_key(request, user_id))
    return _json(
        {
            "deck": {
                "id": deck["id"],
                "title": deck["title"],
                "summary": deck.get("summary"),
                "trackId": deck["trackId"],
                "tierId": deck["tierId"],
                "cissp": deck.get("cissp"),
                "secplus": deck.get("secplus"),
                "saa": deck.get("saa"),
                "cysa": deck.get("cysa"),
                "awss": deck.get("awss"),
                "resources": deck.get("resources", []),
                "cardCount": len(deck["cards"]),
            },
            "cards": deck["cards"],
            "puzzles": deck.get("puzzles", []),
        },
        cache="private, max-age=60",
    )


@router.get("/lesson/{lesson_id}")
def content_lesson(lesson_id: str, request: Request):
    data = load_data()
    content = data["lessons"].get(lesson_id)
    if content is None:
        raise HTTPException(status_code=404, detail="Unknown lesson.")
    user_id = _require_entitled(request, lesson_id in data["freeLessons"])
    _check_rate(_rate_key(request, user_id))
    return _json(
        {
            "lessonId": lesson_id,
            "content": content,
            "cipherNote": data["cipherNotes"].get(lesson_id),
        },
        cache="private, max-age=60",
    )


@router.get("/note/{key:path}")
def content_note(key: str, request: Request):
    data = load_data()
    note = data["notes"].get(key)
    if note is None:
        # Notes can also be keyed by term ("term:<Term>"); the frontend falls
        # back to the concept's short detail when there is no full note.
        raise HTTPException(status_code=404, detail="No full note for this concept.")
    user_id = _require_entitled(request, False)  # notes are premium content
    _check_rate(_rate_key(request, user_id))
    return _json({"key": key, "body": note["body"], "example": note.get("example"), "tip": note.get("tip")},
                 cache="private, max-age=60")


# ---------- exams (built server-side; the client never sees the pools) ----------

#: cert id -> (tag key, domain list key, default question count). Durations and
#: pass marks stay frontend display config (src/lib/academy.js CERT_EXAMS).
CERTS = {
    "cissp": ("cissp", "cissp", 100),
    "secplus": ("secplus", "secplus", 90),
    "aws-saa": ("saa", "saa", 65),
    "cysa": ("cysa", "cysa", 85),
    "aws-security": ("awss", "awss", 65),
}


def domain_quotas(domains: list[dict], total: int) -> dict[int, int]:
    """Per-domain question quotas (largest remainder). Mirrors
    src/lib/academy.js examDomainQuotas exactly, including the stable
    fractional-part tie-break (domain order)."""
    rows = [{"id": d["id"], "exact": (d["weight"] / 100) * total, "n": 0} for d in domains]
    for r in rows:
        r["n"] = math.floor(r["exact"])
    remainder = total - sum(r["n"] for r in rows)
    by_frac = sorted(rows, key=lambda r: r["exact"] - r["n"], reverse=True)
    i = 0
    while remainder > 0:
        by_frac[i % len(by_frac)]["n"] += 1
        i += 1
        remainder -= 1
    return {r["id"]: r["n"] for r in rows}


def build_questions(cards: list[dict], pool: list[dict], count: int, rng: random.Random) -> list[dict]:
    """Build multiple-choice questions from flashcards. Distractors come from the
    card's own `wrong` list when provided, otherwise from other answers in the
    pool. Mirrors src/lib/academy.js buildQuestions."""
    picked = rng.sample(cards, min(count, len(cards))) if cards else []
    # rng.sample returns in selection order; the JS version shuffles first, which
    # is the same distribution. Keep the picked order shuffled like the JS does.
    rng.shuffle(picked)
    questions = []
    for card in picked:
        own = []
        for w in card.get("wrong") or []:
            if w != card["a"] and w not in own:
                own.append(w)
        wrong = own[:3]
        if len(wrong) < 3:
            others = [p["a"] for p in pool if p["id"] != card["id"] and p["a"] != card["a"]]
            rng.shuffle(others)
            for w in others:
                if w != card["a"] and w not in wrong:
                    wrong.append(w)
                if len(wrong) >= 3:
                    break
        options = [card["a"], *wrong]
        rng.shuffle(options)
        questions.append({"card": card, "options": options, "correct": options.index(card["a"])})
    return questions


def build_exam(data: dict, cert_id: str, count: int | None = None, rng: random.Random | None = None) -> dict:
    """Build one timed exam: domain-weighted sampling without replacement, option
    order and question order shuffled. Returns { questions, quotas, shortfalls }
    where each question is { id, domain, card, options, correct }. The card in
    each question carries q/a/x but NOT its `wrong` list (the server already
    built the options). Mirrors the JS builders in src/lib/academy.js."""
    if cert_id not in CERTS:
        raise KeyError(f"unknown cert exam: {cert_id}")
    tag_key, domain_key, default_count = CERTS[cert_id]
    total = count or default_count
    domains = data["domains"][domain_key]
    rng = rng or random.Random()
    quotas = domain_quotas(domains, total)

    decks = _deck_index(data)
    deck_domain = {d["id"]: (d.get(tag_key) or [None])[0] for d in decks.values()}
    cards = _all_cards(data)
    by_domain: dict[int, list[dict]] = {}
    for card in cards:
        dom = deck_domain.get(card["deckId"])
        if dom:
            by_domain.setdefault(dom, []).append(card)

    picked: list[tuple[dict, int]] = []
    shortfalls: list[int] = []
    for d in domains:
        pool = list(by_domain.get(d["id"], []))
        rng.shuffle(pool)
        take = pool[: quotas[d["id"]]]
        picked.extend((c, d["id"]) for c in take)
        if len(take) < quotas[d["id"]]:
            shortfalls.append(d["id"])
    if shortfalls:
        seen = {c["id"] for c, _ in picked}
        missing = total - len(picked)
        rest = [c for c in cards if c["id"] not in seen]
        rng.shuffle(rest)
        for card in rest[:missing]:
            picked.append((card, deck_domain.get(card["deckId"]) or shortfalls[0]))

    questions = []
    for card, domain in rng.sample(picked, len(picked)) if picked else []:
        q = build_questions([card], cards, 1, rng)[0]
        questions.append(
            {
                "id": card["id"],
                "domain": domain,
                "card": {
                    "id": card["id"],
                    "deckId": card["deckId"],
                    "trackId": card["trackId"],
                    "q": card["q"],
                    "a": card["a"],
                    "x": card.get("x"),
                },
                "options": q["options"],
                "correct": q["correct"],
            }
        )
    return {"questions": questions, "quotas": quotas, "shortfalls": shortfalls}


@router.get("/exam/{cert_id}")
def content_exam(cert_id: str, request: Request, count: int | None = None):
    data = load_data()
    if cert_id not in CERTS:
        raise HTTPException(status_code=404, detail="Unknown exam.")
    user_id = _require_entitled(request, False)  # every sim is premium content
    _check_rate(_rate_key(request, user_id))
    _, _, default_count = CERTS[cert_id]
    if count is not None:
        count = max(1, min(count, default_count))
    exam = build_exam(data, cert_id, count)
    return _json({"cert": cert_id, **exam}, cache="no-store")
