"""Tests for net-topology-001: the cabling-puzzle validators and lab wiring."""
import sys
from pathlib import Path

import pytest

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.definitions.topology import (
    TOPOLOGY_LAB, TOPOLOGY_CORE_LAB, TOPOLOGY_DMZ_LAB,
    _DEVICES, _LINKS, _CORE_DEVICES, _CORE_LINKS, _DMZ_DEVICES, _DMZ_LINKS,
)
from labs.registry import LABS
from labs.validators import VALIDATORS


def _findings(devices=None, links=None):
    return {"devices": devices or [], "links": links or []}


# --- devices placed ---

def test_devices_placed_passes_when_all_present():
    passed, _m, _e = VALIDATORS["topology_devices_placed"]({"devices": _DEVICES}, _findings(devices=_DEVICES))
    assert passed


def test_devices_placed_fails_when_missing():
    passed, msg, _e = VALIDATORS["topology_devices_placed"]({"devices": _DEVICES}, _findings(devices=["pc1", "sw1"]))
    assert not passed
    assert "pc2" in msg and "r1" in msg


# --- cabling (links are unordered) ---

def test_cabled_passes_with_links_in_any_order():
    reversed_links = [[b, a] for a, b in _LINKS]  # ['sw1','pc1'] etc.
    passed, _m, _e = VALIDATORS["topology_cabled"]({"links": _LINKS}, _findings(links=reversed_links))
    assert passed


def test_cabled_fails_when_a_cable_is_missing():
    passed, msg, _e = VALIDATORS["topology_cabled"]({"links": _LINKS}, _findings(links=[["pc1", "sw1"]]))
    assert not passed
    assert "sw1" in msg


def test_cabled_ignores_self_loops_and_malformed():
    bad = [["sw1", "sw1"], ["pc1"], None] + _LINKS
    passed, _m, _e = VALIDATORS["topology_cabled"]({"links": _LINKS}, _findings(links=bad))
    assert passed  # the valid required links are all present; junk is dropped


# --- tidy (no extra cables) ---

def test_clean_passes_on_exact_match():
    passed, _m, _e = VALIDATORS["topology_clean"]({"links": _LINKS}, _findings(links=_LINKS))
    assert passed


def test_clean_fails_on_extra_cable():
    passed, msg, _e = VALIDATORS["topology_clean"]({"links": _LINKS}, _findings(links=_LINKS + [["pc1", "r1"]]))
    assert not passed
    assert "pc1" in msg and "r1" in msg


# --- wiring into the registry + client view ---

def test_lab_registered_with_topology_workbench():
    lab = LABS["net-topology-001"]
    assert lab is TOPOLOGY_LAB
    assert lab.shell is None
    assert lab.workbench == "topology"


def test_public_dict_exposes_workbench_and_no_terminal():
    pub = TOPOLOGY_LAB.public_dict()
    assert pub["workbench"] == "topology"
    assert "terminal" not in pub  # shell is None, so the API adds no terminal block


# --- extra levels (same validators, new target designs) ---

@pytest.mark.parametrize("lab_id,devices,links", [
    ("net-topology-002", _CORE_DEVICES, _CORE_LINKS),
    ("net-topology-003", _DMZ_DEVICES, _DMZ_LINKS),
])
def test_extra_levels_registered_and_solvable(lab_id, devices, links):
    lab = LABS[lab_id]
    assert lab.workbench == "topology" and lab.shell is None
    # The lab's own objective args form a self-consistent, solvable design.
    f = _findings(devices=devices, links=links)
    for o in lab.objectives:
        passed, msg, _e = VALIDATORS[o.validator](o.args, f)
        assert passed, f"{lab_id}/{o.id}: {msg}"


def test_each_topology_level_has_unique_id():
    ids = [TOPOLOGY_LAB.id, TOPOLOGY_CORE_LAB.id, TOPOLOGY_DMZ_LAB.id]
    assert len(ids) == len(set(ids))


def test_dmz_rejects_bridging_the_segments():
    # Cabling the DMZ server straight to the inside switch is an extra link.
    bad = _DMZ_LINKS + [["web1", "sw2"]]
    passed, _m, _e = VALIDATORS["topology_clean"]({"links": _DMZ_LINKS}, _findings(links=bad))
    assert not passed
