"""Fixture rows for the PR 4 card-id migration tests and the fixture-based
dry-run rehearsal (test strategy v2.2 #21, #8, #3).

Scratch databases ONLY — never production. Fixtures are built from the real
state shape (`EMPTY` in `src/lib/academy.js:58`) and the real catalogue
(`backend/data/content.json` + the frozen map): card ids in fixtures come
from the real catalogue, positional ids appear only in legacy fixtures,
never as new content.

Each fixture is (user_id, state, expected_state_after_migration,
expected_version_bump). Expected states are HAND-WRITTEN (not computed by
calling the translator — that would test the translator against itself);
the UUID values are resolved from the live catalogue at build time.
"""
from __future__ import annotations

import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent


def load_id_map() -> dict[str, dict]:
    """legacyId -> {"id": uuid, "deckId": deckId}, from the live content.json."""
    import sys

    sys.path.insert(0, str(BACKEND_DIR))
    import progress_ids

    with open(BACKEND_DIR / "data" / "content.json", encoding="utf-8") as fh:
        data = json.load(fh)
    return progress_ids.build_id_map(data)


def build_fixtures(id_map: dict[str, dict]):
    """Return a list of (user_id, state, expected_state, expected_version_bump)."""
    u0 = id_map["py-basics-0"]["id"]
    u1 = id_map["py-basics-1"]["id"]
    p0 = id_map["py-basics-p0"]["id"]

    fixtures = []

    # A — legacy-only cards: every key translates, values byte-identical.
    fixtures.append((
        "pr4-a",
        {"cards": {
            "py-basics-0": {"box": 3, "due": 100, "right": 5, "wrong": 2, "revSeen": 1},
            "py-basics-1": {"box": 1, "due": 50, "right": 0, "wrong": 1},
        }, "xp": 40},
        {"cards": {
            u0: {"box": 3, "due": 100, "right": 5, "wrong": 2, "revSeen": 1},
            u1: {"box": 1, "due": 50, "right": 0, "wrong": 1},
        }, "xp": 40, "cardIdVersion": 2},
        1,
    ))

    # B — UUID-only cards without the version stamp: keys untouched, version stamped.
    fixtures.append((
        "pr4-b",
        {"cards": {u0: {"box": 2, "due": 90, "right": 1, "wrong": 0}}, "xp": 10},
        {"cards": {u0: {"box": 2, "due": 90, "right": 1, "wrong": 0}},
         "xp": 10, "cardIdVersion": 2},
        1,
    ))

    # C — dual-keyed collision, UUID side wins on box (§4.2: higher box wins,
    # right/wrong/revSeen maxed).
    fixtures.append((
        "pr4-c",
        {"cards": {
            "py-basics-0": {"box": 2, "due": 100, "right": 2, "wrong": 1},
            u0: {"box": 3, "due": 50, "right": 3, "wrong": 2, "revSeen": 1},
        }},
        {"cards": {u0: {"box": 3, "due": 50, "right": 3, "wrong": 2, "revSeen": 1}},
         "cardIdVersion": 2},
        1,
    ))

    # D — dual-keyed collision, legacy side wins on box.
    fixtures.append((
        "pr4-d",
        {"cards": {
            "py-basics-1": {"box": 4, "due": 80, "right": 1, "wrong": 0},
            u1: {"box": 2, "due": 90, "right": 5, "wrong": 3},
        }},
        {"cards": {u1: {"box": 4, "due": 80, "right": 5, "wrong": 3}},
         "cardIdVersion": 2},
        1,
    ))

    # E — dual-keyed collision, box tie -> later due wins.
    fixtures.append((
        "pr4-e",
        {"cards": {
            "py-basics-0": {"box": 2, "due": 100, "right": 1, "wrong": 1},
            u0: {"box": 2, "due": 200, "right": 2, "wrong": 0},
        }},
        {"cards": {u0: {"box": 2, "due": 200, "right": 2, "wrong": 1}},
         "cardIdVersion": 2},
        1,
    ))

    # F — unmapped legacy key: preserved untouched, reported as unmapped.
    fixtures.append((
        "pr4-f",
        {"cards": {
            "py-basics-999": {"box": 4, "due": 90, "right": 7, "wrong": 1},
            "py-basics-0": {"box": 1, "due": 10, "right": 0, "wrong": 0},
        }},
        {"cards": {
            "py-basics-999": {"box": 4, "due": 90, "right": 7, "wrong": 1},
            u0: {"box": 1, "due": 10, "right": 0, "wrong": 0},
        }, "cardIdVersion": 2},
        1,
    ))

    # G — resume plan / tries / retried translation, incl. a puzzle step,
    # an unknown legacy step, a UUID-side tries win, and retried dedup.
    fixtures.append((
        "pr4-g",
        {"cards": {"py-basics-0": {"box": 1, "due": 10, "right": 0, "wrong": 0}},
         "resume": {
             "deckId": "py-basics", "index": 1, "at": 500,
             "plan": [
                 {"id": "py-basics-0", "k": "c"},
                 {"id": "py-basics-p0", "k": "p"},
                 {"id": "py-basics-999", "k": "c"},
                 {"id": u1},
             ],
             "tries": {"py-basics-0": True, "py-basics-1-review": False,
                       f"{u1}-review": True},
             "retried": ["py-basics-1-review", f"{u1}-review"],
         }},
        {"cards": {u0: {"box": 1, "due": 10, "right": 0, "wrong": 0}},
         "resume": {
             "deckId": "py-basics", "index": 1, "at": 500,
             "plan": [
                 {"id": u0, "k": "c", "deckId": "py-basics"},
                 {"id": p0, "k": "p"},
                 {"id": "py-basics-999", "k": "c"},
                 {"id": u1, "deckId": "py-basics"},
             ],
             "tries": {u0: True, f"{u1}-review": True},
             "retried": [f"{u1}-review"],
         },
         "cardIdVersion": 2},
        1,
    ))

    # H — empty cards dict: no keys to translate, but the version stamp
    # lands — translate_state stamps any state with card data (PR 3
    # contract), so the row is written once, then stable.
    fixtures.append((
        "pr4-h",
        {"cards": {}, "xp": 0},
        {"cards": {}, "xp": 0, "cardIdVersion": 2},
        1,
    ))

    # I — no cards key at all: row skipped.
    fixtures.append((
        "pr4-i",
        {"xp": 40, "streak": {"count": 3, "last": "2026-11-20"}},
        {"xp": 40, "streak": {"count": 3, "last": "2026-11-20"}},
        0,
    ))

    # J — already migrated (UUID keys + cardIdVersion 2): row skipped.
    fixtures.append((
        "pr4-j",
        {"cards": {u0: {"box": 3, "due": 100, "right": 5, "wrong": 2}},
         "cardIdVersion": 2, "xp": 5},
        {"cards": {u0: {"box": 3, "due": 100, "right": 5, "wrong": 2}},
         "cardIdVersion": 2, "xp": 5},
        0,
    ))

    # K — unexpected top-level keys: preserved by the merge catch-all.
    fixtures.append((
        "pr4-k",
        {"cards": {"py-basics-0": {"box": 1, "due": 10, "right": 0, "wrong": 0}},
         "customNote": "hello", "badges": ["first-steps"]},
        {"cards": {u0: {"box": 1, "due": 10, "right": 0, "wrong": 0}},
         "customNote": "hello", "badges": ["first-steps"], "cardIdVersion": 2},
        1,
    ))

    # L — UUID resume step missing deckId, and nothing else to translate:
    # the client fills deckId in on load; the server does NOT rewrite the
    # row for a fill-in alone (translate_state marks it untranslated).
    fixtures.append((
        "pr4-l",
        {"cards": {u0: {"box": 1, "due": 10, "right": 0, "wrong": 0}},
         "cardIdVersion": 2,
         "resume": {"deckId": "py-basics", "index": 0, "at": 100,
                    "plan": [{"id": u1}], "tries": {}, "retried": []}},
        {"cards": {u0: {"box": 1, "due": 10, "right": 0, "wrong": 0}},
         "cardIdVersion": 2,
         "resume": {"deckId": "py-basics", "index": 0, "at": 100,
                    "plan": [{"id": u1}], "tries": {}, "retried": []}},
        0,
    ))

    # M — every legacy card in the catalogue, legacy-keyed: the worst-case
    # row for the size check (plan §8.5) and the kill-test workload.
    # Card legacy ids end in "-<digits>"; puzzle legacy ids end in "-p<digits>".
    all_legacy_cards = {
        legacy: {"box": 1, "due": 100, "right": 0, "wrong": 0}
        for legacy in id_map
        if legacy.rsplit("-", 1)[-1].isdigit()
    }
    expected_m = {
        id_map[legacy]["id"]: {"box": 1, "due": 100, "right": 0, "wrong": 0}
        for legacy in all_legacy_cards
    }
    fixtures.append((
        "pr4-m",
        {"cards": all_legacy_cards, "xp": 0},
        {"cards": expected_m, "xp": 0, "cardIdVersion": 2},
        1,
    ))

    return fixtures


def kill_fixture_rows(id_map: dict[str, dict], n_rows: int, cards_per_row: int = 100):
    """Rows for the kill-mid-migration test: enough translation + UPDATE work
    that the migration takes seconds, so a SIGKILL at ~0.5 s lands mid-run.
    Each row carries `cards_per_row` distinct legacy card keys."""
    legacy_ids = sorted(k for k in id_map if k.rsplit("-", 1)[-1].isdigit())
    rows = []
    for i in range(n_rows):
        chunk = legacy_ids[(i * cards_per_row) % len(legacy_ids):
                           (i * cards_per_row) % len(legacy_ids) + cards_per_row]
        if len(chunk) < cards_per_row:
            chunk = chunk + legacy_ids[:cards_per_row - len(chunk)]
        rows.append((
            f"pr4-kill-{i}",
            {"cards": {k: {"box": 1, "due": 100, "right": 0, "wrong": 0} for k in chunk},
             "xp": 0},
        ))
    return rows
