"""Tests for net-topology-001: the cabling-puzzle validators and lab wiring."""
import sys
from pathlib import Path

import pytest

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.definitions.topology import (
    TOPOLOGY_LAB, TOPOLOGY_CORE_LAB, TOPOLOGY_DMZ_LAB, TOPOLOGY_FT_LAB, TOPOLOGY_STP_LAB, TOPOLOGY_SEG_LAB,
    _DEVICES, _LINKS, _CORE_DEVICES, _CORE_LINKS, _DMZ_DEVICES, _DMZ_LINKS, _FT_DEVICES, _STP_SWITCHES, _SEG_DEVICES,
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
    ids = [TOPOLOGY_LAB.id, TOPOLOGY_CORE_LAB.id, TOPOLOGY_DMZ_LAB.id, TOPOLOGY_FT_LAB.id, TOPOLOGY_STP_LAB.id, TOPOLOGY_SEG_LAB.id]
    assert len(ids) == len(set(ids))


def test_dmz_rejects_bridging_the_segments():
    # Cabling the DMZ server straight to the inside switch is an extra link.
    bad = _DMZ_LINKS + [["web1", "sw2"]]
    passed, _m, _e = VALIDATORS["topology_clean"]({"links": _DMZ_LINKS}, _findings(links=bad))
    assert not passed


# --- graph-property validators (open-ended levels) ---

def test_reaches_follows_a_multi_hop_path():
    f = _findings(links=[["pc1", "sw1"], ["sw1", "r1"]])
    passed, _m, _e = VALIDATORS["topology_reaches"]({"from": "pc1", "to": "r1"}, f)
    assert passed


def test_reaches_fails_when_no_path():
    f = _findings(links=[["pc1", "sw1"], ["sw2", "r1"]])  # two disjoint islands
    passed, _m, _e = VALIDATORS["topology_reaches"]({"from": "pc1", "to": "r1"}, f)
    assert not passed


def test_redundant_path_fails_on_a_single_chain():
    # One path sw1-r1: cutting it isolates them.
    f = _findings(links=[["sw1", "r1"]])
    passed, msg, _e = VALIDATORS["topology_redundant_path"]({"from": "sw1", "to": "r1"}, f)
    assert not passed
    assert "fault-tolerant" in msg.lower()


def test_redundant_path_passes_with_two_independent_paths():
    # Direct link + a detour through sw2 => 2-edge-connected.
    f = _findings(links=[["sw1", "r1"], ["sw1", "sw2"], ["sw2", "r1"]])
    passed, _m, _e = VALIDATORS["topology_redundant_path"]({"from": "sw1", "to": "r1"}, f)
    assert passed


def test_fault_tolerant_level_is_solvable_many_ways():
    lab = LABS["net-topology-004"]
    assert lab.workbench == "topology"
    # A solution that is NOT the hinted one still passes (open-ended): a ring.
    solution = _findings(
        devices=_FT_DEVICES,
        links=[["pc1", "sw1"], ["sw1", "r1"], ["r1", "sw2"], ["sw2", "sw1"]],
    )
    for o in lab.objectives:
        passed, msg, _e = VALIDATORS[o.validator](o.args, solution)
        assert passed, f"net-topology-004/{o.id}: {msg}"


def test_core_level_now_checks_redundancy():
    lab = LABS["net-topology-002"]
    assert any(o.validator == "topology_redundant_path" for o in lab.objectives)
    # The designed core satisfies every objective, redundancy included.
    f = _findings(devices=_CORE_DEVICES, links=_CORE_LINKS)
    for o in lab.objectives:
        passed, msg, _e = VALIDATORS[o.validator](o.args, f)
        assert passed, f"net-topology-002/{o.id}: {msg}"


# --- connectivity + switching-loop validators (level 5) ---

def test_connected_requires_all_devices_in_one_component():
    ok = _findings(links=[["sw1", "sw2"], ["sw2", "sw3"]])
    passed, _m, _e = VALIDATORS["topology_connected"]({"devices": _STP_SWITCHES}, ok)
    assert passed
    split = _findings(links=[["sw1", "sw2"]])  # sw3 dangling
    passed, msg, _e = VALIDATORS["topology_connected"]({"devices": _STP_SWITCHES}, split)
    assert not passed and "sw3" in msg


def test_no_loop_passes_on_a_tree_fails_on_a_ring():
    tree = _findings(links=[["sw1", "sw2"], ["sw2", "sw3"]])
    passed, _m, _e = VALIDATORS["topology_no_loop"]({"devices": _STP_SWITCHES}, tree)
    assert passed
    ring = _findings(links=[["sw1", "sw2"], ["sw2", "sw3"], ["sw3", "sw1"]])
    passed, msg, _e = VALIDATORS["topology_no_loop"]({"devices": _STP_SWITCHES}, ring)
    assert not passed and "loop" in msg.lower()


def test_no_loop_only_considers_the_named_devices():
    # A loop that runs through a device OUTSIDE the named set is not counted.
    f = _findings(links=[["sw1", "sw2"], ["sw2", "r1"], ["r1", "sw1"]])
    passed, _m, _e = VALIDATORS["topology_no_loop"]({"devices": ["sw1", "sw2"]}, f)
    assert passed  # only sw1-sw2 is within the set; no loop among the named switches


def test_stp_level_solvable_as_a_line():
    lab = LABS["net-topology-005"]
    assert lab.workbench == "topology"
    solution = _findings(devices=_STP_SWITCHES, links=[["sw1", "sw2"], ["sw2", "sw3"]])
    for o in lab.objectives:
        passed, msg, _e = VALIDATORS[o.validator](o.args, solution)
        assert passed, f"net-topology-005/{o.id}: {msg}"


# --- Layer-2 segmentation (level 6) ---

def test_l2_separated_passes_when_router_is_the_only_bridge():
    # pc1-sw1-r1, pc2-sw2-r1: the only path between the PCs crosses the L3 router.
    f = _findings(links=[["pc1", "sw1"], ["sw1", "r1"], ["pc2", "sw2"], ["sw2", "r1"]])
    passed, _m, _e = VALIDATORS["topology_l2_separated"]({"from": "pc1", "to": "pc2", "l3_devices": ["r1"]}, f)
    assert passed


def test_l2_separated_fails_when_switches_are_bridged():
    # Cabling sw1-sw2 merges the two broadcast domains.
    f = _findings(links=[["pc1", "sw1"], ["sw1", "r1"], ["pc2", "sw2"], ["sw2", "r1"], ["sw1", "sw2"]])
    passed, msg, _e = VALIDATORS["topology_l2_separated"]({"from": "pc1", "to": "pc2", "l3_devices": ["r1"]}, f)
    assert not passed and "broadcast domain" in msg.lower()


def test_seg_level_solvable_and_rejects_bridging():
    lab = LABS["net-topology-006"]
    assert lab.workbench == "topology"
    good = _findings(devices=_SEG_DEVICES, links=[["pc1", "sw1"], ["sw1", "r1"], ["pc2", "sw2"], ["sw2", "r1"]])
    for o in lab.objectives:
        passed, msg, _e = VALIDATORS[o.validator](o.args, good)
        assert passed, f"net-topology-006/{o.id}: {msg}"
    # bridging the switches must break only the segmentation objective
    bridged = _findings(devices=_SEG_DEVICES, links=good["links"] + [["sw1", "sw2"]])
    seg = next(o for o in lab.objectives if o.validator == "topology_l2_separated")
    passed, _m, _e = VALIDATORS[seg.validator](seg.args, bridged)
    assert not passed
