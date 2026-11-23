#!/usr/bin/env python3
"""Dry-run card-id migration (PR 4, plan v2.2 §8).

Reads the frozen map + content.json + a scratch database, performs the
EXACT translation the Alembic migration will perform (same code path:
backend/progress_migration.py), in memory, and writes only the report file.
It does not commit — it never writes to the database.

READ-ONLY BY CONSTRUCTION:
- The script issues SELECTs only (no UPDATE/INSERT/DELETE anywhere).
- On Postgres it sets default_transaction_read_only = on before any query,
  so even an accidental write would raise instead of landing.
- Never run it against the live database: it takes a scratch-database URL
  explicitly (--db). Production rehearsals use a dump restored into a
  scratch database, each under its own approval (plan §6.5).

Usage:
    python dry_run_card_id_migration.py --db <scratch-url> --out <report.md> \
        [--content-ref <git-sha>] [--content <path>] [--frozen-map <path>]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import sqlalchemy as sa  # noqa: E402

import progress_migration as pm  # noqa: E402


def _render_report(stats: dict, *, db_url: str, content_ref: str,
                   content_version: int, frozen_cards: int, frozen_puzzles: int) -> str:
    cap = pm.MAX_BYTES
    near_cap = "within 10% of the cap" if stats["rows_within_10pct_of_cap"] else "none within 10% of the cap"
    unmapped = stats["unmapped_keys"]
    never_seen = stats["frozen_keys_never_seen"]
    lines = [
        "# PR 4 — Dry-run migration report (rehearsal 1, fixture-based)",
        "",
        f"- **Content commit:** `{content_ref}` (content.json version {content_version})",
        f"- **Frozen map:** {frozen_cards} cards + {frozen_puzzles} puzzles (closed, PR 2)",
        f"- **Database:** scratch only (`{db_url.split('@')[-1]}`) — read-only dry run, no writes",
        "",
        "## What this rehearsal is — and is not",
        "",
        "- This rehearsal runs against **fixture rows seeded in a scratch "
        "database**, not production data. No production dump was taken and no "
        "production data was read: the production-dump rehearsals (plan §8, "
        "rehearsals 1 and 2 against the latest / a fresh dump) are separate "
        "operations, each needing Spencer's own explicit approval (plan §6.5).",
        "- The dry run **cannot show anonymous browsers' localStorage** "
        "(uncountable by design). That is why the client translation is "
        "always-on and `legacyId` is permanent: the server-side numbers here "
        "are a floor, not a ceiling. Nothing in this report means 'no legacy "
        "keys exist anywhere'.",
        "- Dummy/reserved accounts **cannot be distinguished** in the users "
        "table (no marker column exists): all rows are counted together, "
        "not assumed apart.",
        "",
        "## 1. Row counts",
        "",
        f"- Total `Progress` rows: **{stats['rows_total']}**",
        f"- Rows with non-empty `state`: {stats['rows_non_empty_state']}",
        f"- Rows with at least one legacy card key: {stats['rows_with_legacy_keys']}",
        f"- Rows with zero legacy keys (already clean): {stats['rows_clean']}",
        f"- Rows the migration would change: {stats['rows_changed']}",
        f"- Rows already carrying `cardIdVersion: 2`: {stats['rows_with_card_id_version_2']}",
        "",
        "## 2. Key inventory",
        "",
        f"- Distinct legacy card keys found: {len(stats['distinct_legacy_card_keys'])}",
        f"- Distinct legacy puzzle keys in `resume` plans: {len(stats['distinct_legacy_puzzle_keys'])}",
        f"- Keys found that are **not** in the frozen map (unmapped): "
        f"{len(unmapped)}" + (f" — {', '.join(unmapped)}" if unmapped else " — none"),
        f"- Keys in the frozen map never seen in any row: {len(never_seen)} "
        f"(expected: most of the catalogue — a fixture rehearsal only touches a few decks)",
        "",
        "## 3. Collision check",
        "",
        f"- Two legacy ids mapping to one UUID: **{stats['collision_two_legacy_to_one_uuid']}** (must be zero — hard failure if not)",
        f"- One legacy id mapping to two UUIDs: **{stats['collision_one_legacy_to_two_uuids']}** (must be zero — hard failure if not)",
        f"- Rows already containing BOTH a legacy key and its UUID (§4.2 collision case): "
        f"{stats['rows_with_both_keys']} — each resolves per the deterministic rules "
        "(higher box wins, tie -> later due, right/wrong/revSeen maxed), none discarded",
        "",
        "## 4. Value integrity",
        "",
        f"- Rows verified: {stats['rows_total']}",
        f"- Value mismatches (non-collision `{chr(123)} box, due, right, wrong {chr(125)}` not byte-identical after translation, or an untouched top-level key changed): **{stats['value_mismatches']}** (must be zero)",
        "- Untouched top-level keys (`lessons`, `bosses`, `labs`, `missions`, `xp`, "
        "`streak`, `badges`, `mastered`, `exams`, `exam`, `secplusExams`, "
        f"`secplusExam`, `certExams`, `seenCelebrations`) changed: {stats['untouched_changed'] or 'none'}",
        "",
        "## 5. Size check",
        "",
        f"- Largest `state` JSON before translation: {stats['max_bytes_before']:,} bytes",
        f"- Largest `state` JSON after translation: {stats['max_bytes_after']:,} bytes",
        f"- Largest row: user `{stats['largest_row_user']}` ({stats['largest_row_cards']:,} cards)",
        f"- Cap (`MAX_BYTES`): {cap:,} bytes",
        f"- Rows within 10% of the cap: {stats['rows_within_10pct_of_cap']} ({near_cap})",
        "",
        "## 6. Resume-plan inventory",
        "",
        f"- Rows with a non-null `resume`: {stats['rows_with_resume']}",
        f"- Plan steps referencing legacy card ids: {stats['resume_legacy_cards']}",
        f"- Plan steps referencing legacy puzzle ids: {stats['resume_legacy_puzzles']}",
        f"- Plan steps referencing ids absent from the current catalogue (already-dangling — listed, preserved, not dropped): "
        f"{len(stats['resume_dangling'])}" + (f" — {', '.join(stats['resume_dangling'])}" if stats['resume_dangling'] else " — none"),
        "",
        "## 7. Version distribution",
        "",
        f"- Rows already carrying `cardIdVersion: 2`: {stats['rows_with_card_id_version_2']} (should be zero pre-migration in production; fixtures include already-migrated rows by design)",
        f"- Rows with unexpected top-level keys: {stats['unexpected_top_keys'] or 'none'} (these are the keys the merge catch-all must carry, §4.1)",
        "",
        "## 8. Timing",
        "",
        f"- Wall-clock time for the full translation: {stats['elapsed_s']:.3f} s "
        f"for {stats['rows_total']} rows (sizes the production maintenance window, if any — the migration runs at startup)",
        "",
        "## Verdict",
        "",
    ]
    hard_failures = []
    if stats["collision_two_legacy_to_one_uuid"]:
        hard_failures.append("two legacy ids map to one UUID")
    if stats["collision_one_legacy_to_two_uuids"]:
        hard_failures.append("one legacy id maps to two UUIDs")
    if stats["value_mismatches"]:
        hard_failures.append("value mismatches after translation")
    if hard_failures:
        lines.append(f"**HARD FAILURE — PR 4 BLOCKED:** {'; '.join(hard_failures)}.")
    else:
        lines.append("**Zero hard failures.** No unmapped keys unexplained "
                     f"({len(unmapped)} unmapped, all preserved by design), "
                     "zero value mismatches, no row within 10% of the cap unexplained.")
        if stats["rows_within_10pct_of_cap"]:
            largest = stats["largest_row_user"]
            if largest.startswith("pr4-"):
                lines.append(f"The {stats['rows_within_10pct_of_cap']} row(s) within 10% of "
                             f"the cap is the synthetic worst-case fixture row "
                             f"(`{largest}`, all {stats['largest_row_cards']:,} catalogue "
                             "cards in one row) — it exists to stress this check and "
                             "still fits under the cap. A real learner row that close "
                             "to the cap would need investigation before cutover.")
            else:
                lines.append(f"The row(s) within 10% of the cap (largest: `{largest}`) "
                             "need investigation before cutover — owner: Spencer.")
    lines.append("")
    return "\n".join(lines)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, help="scratch database URL")
    parser.add_argument("--out", required=True, help="report file to write")
    parser.add_argument("--content-ref", default="unknown — pass --content-ref",
                        help="git commit the content.json was read from")
    parser.add_argument("--content", default=str(pm.CONTENT_PATH))
    parser.add_argument("--frozen-map", default=str(pm.FROZEN_MAP_PATH))
    args = parser.parse_args(argv)

    id_map = pm.load_and_validate(Path(args.content), Path(args.frozen_map))
    data = pm.load_content_data(Path(args.content))

    engine = sa.create_engine(args.db, future=True)
    try:
        with engine.connect() as conn:
            if args.db.startswith("postgres"):
                # Any accidental write raises instead of landing.
                conn.exec_driver_sql("SET default_transaction_read_only = on")
            stats = pm.dry_run_rows(conn, id_map)
    finally:
        engine.dispose()

    report = _render_report(
        stats,
        db_url=args.db,
        content_ref=args.content_ref,
        content_version=data.get("version"),
        frozen_cards=len(json_frozen_cards(Path(args.frozen_map))),
        frozen_puzzles=len(json_frozen_puzzles(Path(args.frozen_map))),
    )
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")
    print(f"dry run: {stats['rows_total']} rows, {stats['rows_changed']} would change, "
          f"{len(stats['unmapped_keys'])} unmapped keys, "
          f"{stats['value_mismatches']} value mismatches, "
          f"{stats['elapsed_s']:.3f}s — report written to {out}")
    return 0


def json_frozen_cards(path: Path) -> list:
    import json as _json

    return _json.loads(path.read_text(encoding="utf-8"))["cards"]


def json_frozen_puzzles(path: Path) -> list:
    import json as _json

    return _json.loads(path.read_text(encoding="utf-8"))["puzzles"]


if __name__ == "__main__":
    raise SystemExit(main())
