"""Cyber Missions: story framing over a real lab (vertical slice).

A mission wraps one lab: the same lab objectives, validated the same way,
plus a small set of mission-only objectives (investigate, document, report)
validated against the mission attempt's own findings dict. The mission never
changes what runs or what validates in the lab itself.

Registry: id -> definition, validated once at import (mirroring
labs/registry.py) — every objective must reference a validator that exists,
so a mistyped validator name fails at startup rather than mid-mission.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Any

from labs.registry import get_lab
from labs.validators import VALIDATORS

#: Devices the learner must inspect in the SOC view for op-broken-shield.
TOPOLOGY_DEVICES = ["R1", "PC1", "GUEST", "SRV"]


@dataclass(frozen=True)
class MissionObjective:
    id: str
    label: str
    validator: str  # name resolved via validators.VALIDATORS; unknown names are rejected at load
    args: dict[str, Any] = field(default_factory=dict)
    hints: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class MissionDefinition:
    id: str
    lab_id: str
    lesson_id: str
    cissp_domain: int
    version: int
    callsign: str
    difficulty: str
    estimated_minutes: int
    briefing: list[str]
    debrief_win: str
    debrief_fail: str
    scoring: dict[str, int]
    #: Mission-only objectives. The lab's own objectives (from the wrapped
    #: lab definition) come first in every combined view; see all_objectives().
    objectives: list[MissionObjective] = field(default_factory=list)

    def lab_objectives(self) -> list:
        lab = get_lab(self.lab_id)
        if lab is None:
            raise ValueError(f"mission {self.id} references unknown lab {self.lab_id!r}")
        return list(lab.objectives)

    def all_objectives(self) -> list:
        """All 9 objectives in order: the lab's 5, then the mission's 4."""
        return self.lab_objectives() + list(self.objectives)

    def public_list_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "callsign": self.callsign,
            "lesson_id": self.lesson_id,
            "cissp_domain": self.cissp_domain,
            "difficulty": self.difficulty,
            "estimated_minutes": self.estimated_minutes,
        }

    def public_dict(self) -> dict[str, Any]:
        """Full public view: briefing, objectives (id/label/hints only) and
        scoring — no validator names or args, which are server-side."""
        view = self.public_list_dict()
        view.update({
            "briefing": list(self.briefing),
            "objectives": [
                {"id": o.id, "label": o.label, "hints": list(o.hints)}
                for o in self.all_objectives()
            ],
            "scoring": dict(self.scoring),
            "debrief_win": self.debrief_win,
            "debrief_fail": self.debrief_fail,
        })
        return view


def initial_findings() -> dict[str, Any]:
    """The versioned mission-findings schema for a fresh attempt (v1)."""
    return {
        "version": 1,
        "topology": {"inspected": []},
        "firewall": {"inspected": False},
        "incident_report": {"summary": "", "root_cause": "", "fix": "", "submitted": False},
    }


def copy_findings(findings: dict[str, Any] | None) -> dict[str, Any]:
    """Deep-copy stored findings, repairing a missing/legacy shape into v1."""
    base = initial_findings()
    if not isinstance(findings, dict):
        return base
    out = copy.deepcopy(base)
    out.update({k: copy.deepcopy(v) for k, v in findings.items() if k in base})
    if not isinstance(out.get("topology"), dict):
        out["topology"] = {"inspected": []}
    if not isinstance(out["topology"].get("inspected"), list):
        out["topology"]["inspected"] = []
    if not isinstance(out.get("firewall"), dict):
        out["firewall"] = {"inspected": False}
    if not isinstance(out.get("incident_report"), dict):
        out["incident_report"] = {"summary": "", "root_cause": "", "fix": "", "submitted": False}
    return out


BROKEN_SHIELD = MissionDefinition(
    id="op-broken-shield",
    lab_id="net-acl-001",
    lesson_id="net-security",
    cissp_domain=4,
    version=1,
    callsign="OPERATION BROKEN SHIELD",
    difficulty="beginner",
    estimated_minutes=30,
    briefing=[
        "Orion Technologies — unauthorized traffic detected between two network segments. Sensitive resources may be exposed.",
        "Investigate the topology, inspect the firewall policies, and find the unauthorized path.",
        "Correct the configuration with least privilege — block the intruder, keep legitimate traffic flowing — then document the incident and file your report.",
        "Check where you stand in the Mission Console below: run `objectives` for the list, `progress` for the count, and `hint` when you are stuck. The terminal is the only place your progress is shown — after changing the firewall, run `check` to re-validate first.",
    ],
    debrief_win=(
        "Mission complete, Agent. The unauthorized path is closed, legitimate traffic is flowing, "
        "and your report is filed. That is least privilege in practice — default deny, explicitly "
        "allow only what is required."
    ),
    debrief_fail=(
        "The mission is not complete yet, Agent. Review the open objectives — the network is only "
        "secure when the guest is blocked and trusted hosts still pass."
    ),
    scoring={"per_objective": 10, "completion_bonus": 10},
    objectives=[
        MissionObjective(
            id="topology",
            label="Examine the network topology",
            validator="topology_inspected",
            args={"devices": list(TOPOLOGY_DEVICES)},
            hints=["Open the SOC view and click each device: R1, PC1, GUEST, SRV"],
        ),
        MissionObjective(
            id="firewall-inspect",
            label="Inspect the firewall policies",
            validator="firewall_policy_inspected",
            hints=["Open the firewall console and review the current rules — an empty ACL is the incident"],
        ),
        MissionObjective(
            id="document",
            label="Document the incident",
            validator="incident_documented",
            hints=["Write what happened, the unauthorized path, and the fix you applied"],
        ),
        MissionObjective(
            id="report",
            label="Submit the mission report",
            validator="incident_report_submitted",
            hints=["File the report once every other objective passes"],
        ),
    ],
)

MISSION_DEFINITIONS: dict[str, MissionDefinition] = {}

for _mission in (BROKEN_SHIELD,):
    if _mission.id in MISSION_DEFINITIONS:
        raise ValueError(f"duplicate mission id: {_mission.id}")
    lab = get_lab(_mission.lab_id)
    if lab is None:
        raise ValueError(f"mission {_mission.id} references unknown lab {_mission.lab_id!r}")
    for _obj in _mission.all_objectives():
        if _obj.validator not in VALIDATORS:
            raise ValueError(
                f"mission {_mission.id} objective {_obj.id} references unknown validator {_obj.validator!r}"
            )
    MISSION_DEFINITIONS[_mission.id] = _mission


def get_mission(mission_id: str) -> MissionDefinition | None:
    return MISSION_DEFINITIONS.get(mission_id)


def list_missions() -> list[MissionDefinition]:
    return list(MISSION_DEFINITIONS.values())
