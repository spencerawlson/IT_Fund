"""Card-id translation for server-side progress normalisation (PR 3).

Pure functions over progress states, mirroring src/lib/progress/migrateCardIds.js:
translate legacy (positional) card ids to UUIDs per the frozen map (built from
content.json), applying the §4.2 collision rules; dual-key a UUID-only state
for unmarked (old) clients. No I/O here; the map is built by the caller from
a content.json dataset. No function here mutates its input.
"""
from __future__ import annotations

import re

_UUID_V4 = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I
)
_LEGACY_SHAPE = re.compile(r"-(p)?\d+$")


def is_uuid(value) -> bool:
    return isinstance(value, str) and bool(_UUID_V4.match(value))


def is_legacy_shaped(value) -> bool:
    return isinstance(value, str) and not is_uuid(value) and bool(_LEGACY_SHAPE.search(value))


def build_id_map(data: dict) -> dict[str, dict]:
    """legacyId -> {"id": uuid, "deckId": deckId}, from a content.json dataset."""
    out: dict[str, dict] = {}
    for track in data.get("tracks", []):
        for tier in track.get("tiers", []):
            for deck in tier.get("decks", []):
                for card in deck.get("cards", []):
                    if "legacyId" in card:
                        out[card["legacyId"]] = {"id": card["id"], "deckId": card["deckId"]}
                for puzzle in deck.get("puzzles", []):
                    if "legacyId" in puzzle:
                        out[puzzle["legacyId"]] = {
                            "id": puzzle["id"],
                            "deckId": puzzle.get("deckId", deck["id"]),
                        }
    return out


def _num(value) -> float:
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else 0


def _combine_records(a: dict, b: dict) -> dict:
    """The §4.2 per-card rule: higher box wins, tie -> later due, right/wrong/revSeen maxed."""
    if _num(a.get("box")) > _num(b.get("box")):
        pick = a
    elif _num(b.get("box")) > _num(a.get("box")):
        pick = b
    else:
        pick = a if _num(a.get("due")) >= _num(b.get("due")) else b
    merged = {
        **pick,
        "right": max(_num(a.get("right")), _num(b.get("right"))),
        "wrong": max(_num(a.get("wrong")), _num(b.get("wrong"))),
    }
    if a.get("revSeen") is not None or b.get("revSeen") is not None:
        merged["revSeen"] = max(_num(a.get("revSeen")), _num(b.get("revSeen")))
    return merged


def _split_suffix(key: str) -> tuple[str, str]:
    if not isinstance(key, str):
        return key, ""
    if key.endswith("-review"):
        return key[: -len("-review")], "-review"
    if key.endswith("-warm"):
        return key[: -len("-warm")], "-warm"
    return key, ""


def _translate_cards(cards: dict, id_map: dict) -> tuple[dict, bool, list]:
    out: dict = {}
    unmapped: list = []
    changed = False
    # Pass 1: keys that are already current land first, so a legacy key
    # folding in afterwards can only combine — never overwrite — the
    # UUID-side record.
    for key, record in cards.items():
        if key in id_map:
            continue
        if is_legacy_shaped(key):
            unmapped.append(key)
        out[key] = record
    # Pass 2: legacy keys translate to their UUID, combining on collision.
    for key, record in cards.items():
        entry = id_map.get(key)
        if entry is None:
            continue
        changed = True
        target = entry["id"]
        out[target] = _combine_records(out[target], record) if target in out else record
    return out, changed, unmapped


def _translate_resume(resume: dict, id_map: dict, uuid_to_deck: dict) -> tuple[dict, bool, set]:
    changed = False
    unmapped: set = set()
    plan = []
    for step in resume.get("plan") or []:
        if not isinstance(step, dict):
            plan.append(step)
            continue
        entry = id_map.get(step.get("id"))
        if entry is None:
            if is_legacy_shaped(step.get("id")):
                unmapped.add(step.get("id"))
            if step.get("k") != "p" and step.get("deckId") is None and step.get("id") in uuid_to_deck:
                plan.append({**step, "deckId": uuid_to_deck[step["id"]]})
            else:
                plan.append(step)
            continue
        changed = True
        if step.get("k") == "p":
            plan.append({**step, "id": entry["id"]})
        else:
            plan.append({**step, "id": entry["id"], "deckId": entry["deckId"]})
    # tries: two passes so a UUID-side value wins on collision — it was
    # written by the new client and is strictly newer than any legacy key.
    tries: dict = {}
    for key, value in (resume.get("tries") or {}).items():
        base, suffix = _split_suffix(key)
        entry = id_map.get(base)
        if entry is not None:
            changed = True
            tries[entry["id"] + suffix] = value
        else:
            if is_legacy_shaped(base):
                unmapped.add(base)
            tries[key] = value
    for key, value in (resume.get("tries") or {}).items():
        base, _ = _split_suffix(key)
        if base not in id_map and not is_legacy_shaped(base):
            tries[key] = value
    retried: list = []
    for entry_key in resume.get("retried") or []:
        base, suffix = _split_suffix(entry_key)
        entry = id_map.get(base)
        if entry is not None:
            changed = True
            new_key = entry["id"] + suffix
            if new_key not in retried:
                retried.append(new_key)
        else:
            if is_legacy_shaped(base):
                unmapped.add(base)
            if entry_key not in retried:
                retried.append(entry_key)
    return {**resume, "plan": plan, "tries": tries, "retried": retried}, changed, unmapped


def translate_state(state, id_map: dict) -> dict:
    """Translate a progress state from legacy ids to UUIDs.

    Returns {"state": ..., "translated": bool, "unmapped": [...]}. `translated`
    is true when any key was rewritten or cardIdVersion was set; `unmapped`
    lists legacy-shaped ids with no frozen-map entry, preserved untouched.
    """
    if not isinstance(state, dict):
        return {"state": state, "translated": False, "unmapped": []}
    uuid_to_deck = {entry["id"]: entry["deckId"] for entry in id_map.values()}
    unmapped: set = set()
    changed = False
    next_state = dict(state)
    cards = state.get("cards")
    if isinstance(cards, dict):
        new_cards, cards_changed, cards_unmapped = _translate_cards(cards, id_map)
        changed = changed or cards_changed
        unmapped.update(cards_unmapped)
        next_state["cards"] = new_cards
    resume = state.get("resume")
    if isinstance(resume, dict):
        new_resume, resume_changed, resume_unmapped = _translate_resume(resume, id_map, uuid_to_deck)
        changed = changed or resume_changed
        unmapped.update(resume_unmapped)
        next_state["resume"] = new_resume
    has_card_data = isinstance(cards, dict) or isinstance(resume, dict)
    if has_card_data and state.get("cardIdVersion") != 2:
        next_state["cardIdVersion"] = 2
        changed = True
    return {"state": next_state, "translated": changed, "unmapped": sorted(unmapped)}


def dual_key_state(state, id_map: dict) -> dict:
    """For unmarked (old) clients: the stored state with BOTH keys per card.

    For each card in the stored (UUID-keyed) state that has a frozen-map
    entry, the response contains the UUID entry and a legacy entry with the
    same values under the legacy id (contract §3). The stored row is never
    modified; this returns a new dict. Resume passes through unchanged.
    """
    if not isinstance(state, dict):
        return state
    cards = state.get("cards")
    if not isinstance(cards, dict):
        return state
    new_cards = dict(cards)
    for legacy, entry in id_map.items():
        if entry["id"] in new_cards:
            new_cards[legacy] = new_cards[entry["id"]]
    return {**state, "cards": new_cards}
