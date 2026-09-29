"""Lab registry: id -> definition, validated once at import.

Every objective must reference a validator that exists, so a mistyped validator name fails at
startup rather than when a student clicks "Check my work".
"""
from __future__ import annotations

from labs.definitions import ALL_LABS
from labs.models import LabDefinition
from labs.validators import VALIDATORS

LABS: dict[str, LabDefinition] = {}

for _lab in ALL_LABS:
    if _lab.id in LABS:
        raise ValueError(f"duplicate lab id: {_lab.id}")
    for _obj in _lab.objectives:
        if _obj.validator not in VALIDATORS:
            raise ValueError(f"lab {_lab.id} objective {_obj.id} references unknown validator {_obj.validator!r}")
    LABS[_lab.id] = _lab


def get_lab(lab_id: str) -> LabDefinition | None:
    return LABS.get(lab_id)


def list_labs() -> list[LabDefinition]:
    return list(LABS.values())
