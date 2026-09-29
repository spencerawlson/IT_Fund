"""Outcome-based validators.

Each validator inspects the recorded lab STATE (the `findings` a student has captured), not which
commands were typed, so a student can reach an objective by any valid route. A validator is a
function (target-args, findings) -> (passed, message, evidence). Objectives reference a validator by
name; the name must exist here or the lab fails to load (see registry.py).
"""
from __future__ import annotations

from typing import Any, Callable

# A validator returns (passed, message, evidence).
Validator = Callable[[dict[str, Any], dict[str, Any]], tuple[bool, str, Any]]

VALIDATORS: dict[str, Validator] = {}


def validator(name: str) -> Callable[[Validator], Validator]:
    def register(fn: Validator) -> Validator:
        if name in VALIDATORS:
            raise ValueError(f"duplicate validator: {name}")
        VALIDATORS[name] = fn
        return fn

    return register


def _ports_for(findings: dict[str, Any], target: str) -> list[dict]:
    return [p for p in findings.get("ports", []) if p.get("target", target) == target]


# ---- cybersecurity: enumeration ----

@validator("host_discovered")
def host_discovered(args, findings):
    target = args["target"]
    hosts = findings.get("hosts", {})
    if hosts.get(target, {}).get("up"):
        return True, f"You confirmed {target} is reachable.", {"target": target}
    return False, f"{target} has not been confirmed reachable yet.", None


@validator("ports_discovered")
def ports_discovered(args, findings):
    target = args["target"]
    ports = _ports_for(findings, target)
    if ports:
        nums = sorted({p["port"] for p in ports})
        return True, f"You discovered {len(nums)} open port(s) on {target}.", {"target": target, "ports": nums}
    return False, "No exposed ports have been recorded yet.", None


@validator("services_identified")
def services_identified(args, findings):
    target = args["target"]
    named = [p for p in _ports_for(findings, target) if p.get("service")]
    if named:
        return True, f"You identified services on {len(named)} port(s).", {"services": named}
    return False, "No services have been identified on the recorded ports yet.", None


@validator("versions_identified")
def versions_identified(args, findings):
    target = args["target"]
    versioned = [p for p in _ports_for(findings, target) if p.get("version")]
    if versioned:
        return True, f"You captured version detail for {len(versioned)} service(s).", {"services": versioned}
    return False, "No service versions have been recorded yet.", None


# ---- cybersecurity: manual vs PortBlast ----

@validator("manual_enumeration_complete")
def manual_enumeration_complete(args, findings):
    target = args["target"]
    if _ports_for(findings, target):
        return True, "Manual enumeration recorded.", None
    return False, "Record your manual enumeration findings first.", None


@validator("research_complete")
def research_complete(args, findings):
    if findings.get("research"):
        return True, "Vulnerability research recorded.", {"count": len(findings["research"])}
    return False, "No vulnerability research has been recorded yet.", None


@validator("portblast_result_exists")
def portblast_result_exists(args, findings):
    # PortBlast writes its normalized result here via the adapter; we only check it exists.
    if findings.get("portblast"):
        return True, "A PortBlast result is available for comparison.", None
    return False, "Run PortBlast against the training target to produce a result.", None


@validator("comparison_complete")
def comparison_complete(args, findings):
    if findings.get("comparison"):
        return True, "You compared your manual findings with PortBlast.", None
    return False, "Complete the manual-vs-PortBlast comparison.", None


# ---- networking: state checks against the recorded device config ----

def _config_flag(findings: dict[str, Any], key: str) -> bool:
    return bool(findings.get("config", {}).get(key))


def _network_validator(key: str, ok: str, todo: str) -> Validator:
    def fn(args, findings):
        return (True, ok, None) if _config_flag(findings, key) else (False, todo, None)

    return fn


for _key, _ok, _todo in [
    ("vlan10_exists", "VLAN 10 exists.", "VLAN 10 has not been created yet."),
    ("vlan20_exists", "VLAN 20 exists.", "VLAN 20 has not been created yet."),
    ("sw1_trunk_configured", "SW1 trunk is configured.", "Configure the trunk on SW1."),
    ("sw2_trunk_configured", "SW2 trunk is configured.", "Configure the trunk on SW2."),
    ("router_interfaces_configured", "Router sub-interfaces are configured.", "Configure the router's inter-VLAN interfaces."),
    ("pc1_reaches_gateway", "PC1 reaches its gateway.", "PC1 cannot reach its gateway yet."),
    ("pc2_reaches_gateway", "PC2 reaches its gateway.", "PC2 cannot reach its gateway yet."),
    ("pc1_reaches_pc2", "PC1 reaches PC2 across VLANs.", "PC1 cannot reach PC2 yet."),
]:
    VALIDATORS[_key] = _network_validator(_key, _ok, _todo)
