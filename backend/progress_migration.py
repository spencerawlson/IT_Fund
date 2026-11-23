"""Server-side card-id migration (PR 4 — Migration and Cutover).

The Alembic data migration and the dry-run script share this module, so the
dry run performs the EXACT translation the migration will perform — one code
path, no reimplementation drift. The translation itself lives in
progress_ids.translate_state (PR 3, mirrors the client translator in
src/lib/progress/migrateCardIds.js); the collision rules are plan §4.2.

Validation gate (plan §6.1): content.json on disk must be version 2 and the
frozen map must match it exactly, or the migration fails loudly WITHOUT
touching a row — a restart without a pull must never migrate against stale
content.

The migration is pure DML on Progress.state: for each row it translates
state.cards keys and state.resume (plan steps, tries, retried) per §4.2,
sets cardIdVersion: 2, and bumps the optimistic-lock version so any
in-flight client PUT with the pre-migration version gets a 409 and
re-fetches the migrated state. Rows with no legacy keys are skipped
(idempotent — safe to re-run). The whole revision runs inside Alembic's
single transaction (backend/alembic/env.py), so a kill or error mid-run
rolls back everything: no partial translation, alembic_version unchanged.
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

import sqlalchemy as sa

from progress_ids import build_id_map, translate_state

log = logging.getLogger(__name__)

CONTENT_PATH = Path(__file__).resolve().parent / "data" / "content.json"
FROZEN_MAP_PATH = (
    Path(__file__).resolve().parent.parent / "scripts" / "legacy-card-ids.json"
)

# Must match backend/progress_api.py:22 (the PUT cap). The dry-run size check
# uses the same number; test_progress_migration asserts the two stay equal.
MAX_BYTES = 256 * 1024

# Top-level state keys the translator must never touch (plan §8.4).
UNTOUCHED_KEYS = (
    "lessons", "bosses", "labs", "missions", "xp", "streak", "badges",
    "mastered", "exams", "exam", "secplusExams", "secplusExam",
    "certExams", "seenCelebrations",
)

# Keys every real state may carry (EMPTY in src/lib/academy.js:58 + the
# version stamp). Anything else is reported as an unexpected top-level key.
KNOWN_TOP_LEVEL_KEYS = set(UNTOUCHED_KEYS) | {
    "cards", "resume", "cardIdVersion", "days", "bestCombo",
}


def load_content_data(path=None) -> dict:
    path = CONTENT_PATH if path is None else Path(path)
    if not path.exists():
        raise RuntimeError(
            f"content.json is missing at {path} — run "
            "`node scripts/export-content.mjs` to generate it; refusing to migrate"
        )
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def load_frozen_map(path=None) -> dict[str, str]:
    """legacyId -> uuid, from the frozen map (scripts/legacy-card-ids.json).

    The map is CLOSED at 3,229 cards + 76 puzzles (PR 2). Duplicate legacy
    ids or entries missing legacyId/id are a hard failure, not a warning.
    """
    path = FROZEN_MAP_PATH if path is None else Path(path)
    if not path.exists():
        raise RuntimeError(
            f"frozen map is missing at {path} — refusing to migrate without it"
        )
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    pairs: dict[str, str] = {}
    for section in ("cards", "puzzles"):
        entries = data.get(section)
        if not isinstance(entries, list):
            raise RuntimeError(f"frozen map at {path}: '{section}' is not a list")
        for entry in entries:
            legacy = entry.get("legacyId")
            uuid = entry.get("id")
            if not legacy or not uuid:
                raise RuntimeError(
                    f"frozen map at {path}: entry without legacyId/id in '{section}': {entry!r}"
                )
            if legacy in pairs:
                raise RuntimeError(
                    f"frozen map at {path}: duplicate legacy id {legacy!r}"
                )
            pairs[legacy] = uuid
    return pairs


def validate_content(data: dict, frozen_pairs: dict[str, str]) -> dict[str, dict]:
    """The validation gate. Returns the id_map (legacyId -> {id, deckId}).

    Raises RuntimeError — naming the mismatch — unless ALL of these hold:
    content.json is version 2; every legacy id in content.json is in the
    frozen map with the SAME uuid; every frozen-map id is in content.json;
    no legacy id appears twice in content.json (build_id_map would silently
    keep the last one, so the duplicate check is done here, explicitly).
    """
    version = data.get("version")
    if version != 2:
        raise RuntimeError(
            f"content.json version is {version}, expected 2 — refusing to "
            "migrate against stale content (pull first, then restart)"
        )
    id_map = build_id_map(data)
    # Duplicate legacy ids in content.json (build_id_map keeps the last).
    seen: dict[str, str] = {}
    for track in data.get("tracks", []):
        for tier in track.get("tiers", []):
            for deck in tier.get("decks", []):
                for card in deck.get("cards", []) + deck.get("puzzles", []):
                    legacy = card.get("legacyId")
                    if legacy is None:
                        continue
                    if legacy in seen and seen[legacy] != card["id"]:
                        raise RuntimeError(
                            f"content.json: legacy id {legacy!r} maps to two "
                            f"uuids ({seen[legacy]} and {card['id']})"
                        )
                    seen[legacy] = card["id"]
    content_pairs = {legacy: entry["id"] for legacy, entry in id_map.items()}
    for legacy, uuid in content_pairs.items():
        if legacy not in frozen_pairs:
            raise RuntimeError(
                f"content.json legacy id {legacy!r} is not in the frozen map — "
                "the map is closed; refusing to migrate"
            )
        if frozen_pairs[legacy] != uuid:
            raise RuntimeError(
                f"frozen map mismatch for {legacy!r}: content.json says "
                f"{uuid}, frozen map says {frozen_pairs[legacy]}"
            )
    for legacy in frozen_pairs:
        if legacy not in content_pairs:
            raise RuntimeError(
                f"frozen map legacy id {legacy!r} is not in content.json — "
                "the map and the content disagree; refusing to migrate"
            )
    return id_map


def translate_progress_state(state, id_map: dict) -> dict:
    """Module-level wrapper over progress_ids.translate_state, so tests can
    monkeypatch the translator (forced-error / partial-execution injection)
    and the migration + dry run both call this one name."""
    return translate_state(state, id_map)


def _state_bytes(state) -> int:
    return len(json.dumps(state, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def _progress_table() -> sa.Table:
    return sa.Table(
        "progress",
        sa.MetaData(),
        sa.Column("user_id", sa.String, primary_key=True),
        sa.Column("state", sa.JSON),
        sa.Column("version", sa.Integer),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )


def _analyse_row(state, id_map: dict, uuid_set: set | None = None) -> dict:
    """Translate one state in memory and inventory it (plan §8). No I/O."""
    if uuid_set is None:
        uuid_set = {entry["id"] for entry in id_map.values()}
    out = {
        "state": state,
        "translated": False,
        "unmapped": [],
        "legacy_card_keys": [],
        "legacy_puzzle_keys": [],
        "has_both_keys": False,
        "has_resume": False,
        "resume_legacy_cards": 0,
        "resume_legacy_puzzles": 0,
        "resume_dangling": [],
        "value_mismatch": False,
        "untouched_changed": [],
        "unexpected_top_keys": [],
        "bytes_before": _state_bytes(state) if isinstance(state, dict) else 0,
        "bytes_after": 0,
    }
    if not isinstance(state, dict):
        return out
    cards = state.get("cards")
    if isinstance(cards, dict):
        for key in cards:
            entry = id_map.get(key)
            if entry is not None:
                out["legacy_card_keys"].append(key)
                if entry["id"] in cards:
                    out["has_both_keys"] = True
    resume = state.get("resume")
    if isinstance(resume, dict):
        out["has_resume"] = True
        for step in resume.get("plan") or []:
            if not isinstance(step, dict):
                continue
            step_id = step.get("id")
            entry = id_map.get(step_id)
            if entry is not None:
                if step.get("k") == "p":
                    out["legacy_puzzle_keys"].append(step_id)
                    out["resume_legacy_puzzles"] += 1
                else:
                    out["resume_legacy_cards"] += 1
            elif isinstance(step_id, str) and step_id and step_id not in uuid_set:
                # Absent from the catalogue entirely: already-dangling.
                # A current UUID id is in the catalogue — it is not dangling.
                out["resume_dangling"].append(step_id)
    result = translate_progress_state(state, id_map)
    out["state"] = result["state"]
    out["translated"] = result["translated"]
    out["unmapped"] = result["unmapped"]
    out["bytes_after"] = _state_bytes(result["state"])
    # Value integrity (§8.4): non-collision records must be byte-identical
    # under their new key; untouched top-level keys must be identical.
    if isinstance(cards, dict):
        new_cards = result["state"].get("cards") or {}
        for key in out["legacy_card_keys"]:
            entry = id_map[key]
            if entry["id"] in cards:
                continue  # collision row: combined per §4.2, checked by tests
            if new_cards.get(entry["id"]) != cards[key]:
                out["value_mismatch"] = True
    for key in UNTOUCHED_KEYS:
        if key in state and state.get(key) != result["state"].get(key):
            out["untouched_changed"].append(key)
    out["unexpected_top_keys"] = sorted(set(state) - KNOWN_TOP_LEVEL_KEYS)
    return out


def _iter_rows(conn):
    table = _progress_table()
    return conn.execute(
        sa.select(table.c.user_id, table.c.state, table.c.version)
    ).all()


def _empty_stats() -> dict:
    return {
        "rows_total": 0,
        "rows_non_empty_state": 0,
        "rows_with_legacy_keys": 0,
        "rows_clean": 0,
        "rows_changed": 0,
        "rows_with_both_keys": 0,
        "rows_with_resume": 0,
        "rows_with_card_id_version_2": 0,
        "distinct_legacy_card_keys": set(),
        "distinct_legacy_puzzle_keys": set(),
        "unmapped_keys": set(),
        "unmapped_rows": 0,
        "frozen_keys_never_seen": set(),
        "collision_two_legacy_to_one_uuid": 0,
        "collision_one_legacy_to_two_uuids": 0,
        "value_mismatches": 0,
        "untouched_changed": set(),
        "unexpected_top_keys": set(),
        "resume_legacy_cards": 0,
        "resume_legacy_puzzles": 0,
        "resume_dangling": set(),
        "max_bytes_before": 0,
        "max_bytes_after": 0,
        "largest_row_user": "",
        "largest_row_cards": 0,
        "rows_within_10pct_of_cap": 0,
        "elapsed_s": 0.0,
    }


def _collect(stats: dict, analysis: dict, state, user_id: str = "") -> None:
    stats["rows_total"] += 1
    if isinstance(state, dict) and state:
        stats["rows_non_empty_state"] += 1
    if analysis["legacy_card_keys"] or analysis["legacy_puzzle_keys"]:
        stats["rows_with_legacy_keys"] += 1
    else:
        stats["rows_clean"] += 1
    if analysis["translated"]:
        stats["rows_changed"] += 1
    if analysis["has_both_keys"]:
        stats["rows_with_both_keys"] += 1
    if analysis["has_resume"]:
        stats["rows_with_resume"] += 1
    if isinstance(state, dict) and state.get("cardIdVersion") == 2:
        stats["rows_with_card_id_version_2"] += 1
    stats["distinct_legacy_card_keys"].update(analysis["legacy_card_keys"])
    stats["distinct_legacy_puzzle_keys"].update(analysis["legacy_puzzle_keys"])
    if analysis["unmapped"]:
        stats["unmapped_rows"] += 1
        stats["unmapped_keys"].update(analysis["unmapped"])
    if analysis["value_mismatch"]:
        stats["value_mismatches"] += 1
    stats["untouched_changed"].update(analysis["untouched_changed"])
    stats["unexpected_top_keys"].update(analysis["unexpected_top_keys"])
    stats["resume_legacy_cards"] += analysis["resume_legacy_cards"]
    stats["resume_legacy_puzzles"] += analysis["resume_legacy_puzzles"]
    stats["resume_dangling"].update(analysis["resume_dangling"])
    stats["max_bytes_before"] = max(stats["max_bytes_before"], analysis["bytes_before"])
    stats["max_bytes_after"] = max(stats["max_bytes_after"], analysis["bytes_after"])
    if analysis["bytes_after"] >= stats["max_bytes_after"] and analysis["bytes_after"] > 0:
        stats["largest_row_user"] = user_id
        stats["largest_row_cards"] = len((state or {}).get("cards") or {}) \
            if isinstance(state, dict) else 0
    if analysis["bytes_after"] >= int(MAX_BYTES * 0.9):
        stats["rows_within_10pct_of_cap"] += 1


def _finalise(stats: dict, id_map: dict) -> dict:
    seen = stats["distinct_legacy_card_keys"] | stats["distinct_legacy_puzzle_keys"]
    stats["frozen_keys_never_seen"] = set(id_map) - seen
    # Collision check (§8.3): the frozen map is 1:1 by construction, but the
    # report must show the check was run, not assume it.
    reverse: dict[str, list[str]] = {}
    for legacy, entry in id_map.items():
        reverse.setdefault(entry["id"], []).append(legacy)
    stats["collision_two_legacy_to_one_uuid"] = sum(
        1 for v in reverse.values() if len(v) > 1
    )
    stats["collision_one_legacy_to_two_uuids"] = 0  # a dict cannot map one key twice
    for key in ("distinct_legacy_card_keys", "distinct_legacy_puzzle_keys",
                "unmapped_keys", "frozen_keys_never_seen", "untouched_changed",
                "unexpected_top_keys", "resume_dangling"):
        stats[key] = sorted(stats[key])
    return stats


def migrate_progress_rows(conn, id_map: dict) -> dict:
    """Translate every Progress row in place (single transaction — the caller,
    Alembic's env, owns the transaction). Returns the stats dict."""
    started = time.monotonic()
    stats = _empty_stats()
    table = _progress_table()
    now = datetime.now(timezone.utc)
    uuid_set = {entry["id"] for entry in id_map.values()}
    for user_id, state, _version in _iter_rows(conn):
        analysis = _analyse_row(state, id_map, uuid_set)
        _collect(stats, analysis, state, user_id)
        if analysis["translated"]:
            conn.execute(
                sa.update(table)
                .where(table.c.user_id == user_id)
                .values(
                    state=analysis["state"],
                    version=table.c.version + 1,
                    updated_at=now,
                )
            )
    stats["elapsed_s"] = round(time.monotonic() - started, 3)
    return _finalise(stats, id_map)


def dry_run_rows(conn, id_map: dict) -> dict:
    """The dry run (plan §8): the exact translation, in memory, no writes.
    Returns the §8 stats dict. The caller must guarantee read-only access
    (the dry-run script sets default_transaction_read_only on Postgres)."""
    started = time.monotonic()
    stats = _empty_stats()
    uuid_set = {entry["id"] for entry in id_map.values()}
    for user_id, state, _version in _iter_rows(conn):
        _collect(stats, _analyse_row(state, id_map, uuid_set), state, user_id)
    stats["elapsed_s"] = round(time.monotonic() - started, 3)
    return _finalise(stats, id_map)


def load_and_validate(content_path=None, frozen_map_path=None) -> dict[str, dict]:
    """Load content.json + the frozen map and run the validation gate.
    Returns the id_map. Raises RuntimeError before any row is touched."""
    data = load_content_data(content_path)
    frozen_pairs = load_frozen_map(frozen_map_path)
    return validate_content(data, frozen_pairs)


def run_migration(bind) -> dict:
    """The Alembic revision's entry point: validate first, then migrate."""
    id_map = load_and_validate()
    stats = migrate_progress_rows(bind, id_map)
    log.info(
        "PR 4 card-id migration: %d rows, %d changed, %d clean, "
        "%d unmapped keys in %d rows, %.3fs",
        stats["rows_total"], stats["rows_changed"], stats["rows_clean"],
        len(stats["unmapped_keys"]), stats["unmapped_rows"], stats["elapsed_s"],
    )
    return stats
