"""Tests for the Cisco IOS and Linux networking shells and the new networking labs."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from fastapi.testclient import TestClient
import main
from labs import sessions as sessions_mod
from labs.registry import get_lab
from labs.shells import cisco_ios, linux_logs, linux_net, meta
from labs.sessions import SessionService

client = TestClient(main.app)

VLAN = get_lab("net-vlan-001")
STATIC = get_lab("net-static-routing-001")
DNS = get_lab("net-dns-connectivity-001")


def _run(lab_id, cmds):
    svc = SessionService()
    s = asyncio.run(svc.start(lab_id, "u1"))
    last = None
    for c in cmds:
        s, last = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s, last


VLAN_STEPS = [
    "enable", "conf t", "vlan 10", "name SALES", "exit", "vlan 20", "name ENG", "exit",
    "interface gi0/1", "switchport mode access", "switchport access vlan 10", "exit",
    "interface gi0/2", "switchport mode access", "switchport access vlan 20", "exit",
    "interface gi0/24", "switchport mode trunk", "end",
    "connect R1", "enable", "conf t", "interface gi0/0", "no shutdown", "exit",
    "interface gi0/0.10", "encapsulation dot1q 10", "ip address 192.168.10.1 255.255.255.0", "exit",
    "interface gi0/0.20", "encapsulation dot1q 20", "ip address 192.168.20.1 255.255.255.0", "end",
]

STATIC_STEPS = [
    "enable", "conf t",
    "interface gi0/0", "ip address 192.168.1.1 255.255.255.0", "no shutdown", "exit",
    "interface gi0/1", "ip address 10.0.0.1 255.255.255.0", "no shutdown", "exit",
    "ip route 192.168.2.0 255.255.255.0 10.0.0.2", "end",
    "connect R2", "enable", "conf t",
    "interface gi0/0", "ip address 192.168.2.1 255.255.255.0", "no shutdown", "exit",
    "interface gi0/1", "ip address 10.0.0.2 255.255.255.0", "no shutdown", "exit",
    "ip route 192.168.1.0 255.255.255.0 10.0.0.1", "end",
]


# ---- Cisco IOS engine ----

def test_vlan_lab_completes_via_terminal():
    s, _ = _run("net-vlan-001", VLAN_STEPS + ["connect PC1", "ping 192.168.20.10"])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_static_routing_lab_completes_via_terminal():
    s, _ = _run("net-static-routing-001", STATIC_STEPS + ["connect PC1", "ping 192.168.2.10"])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_missing_trunk_blocks_connectivity():
    steps = [c for c in VLAN_STEPS if c not in ("interface gi0/24", "switchport mode trunk")]
    s, _ = _run("net-vlan-001", steps)
    assert s.progress["trunk"] is False
    assert s.progress["connectivity"] is False
    assert s.progress["vlans"] is True  # the rest still validated


def test_ping_fails_before_config_and_succeeds_after():
    # Fresh session: PC1 pinging PC2 must fail.
    svc = SessionService()
    s = asyncio.run(svc.start("net-vlan-001", "u1"))
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "connect PC1"))
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "ping 192.168.20.10"))
    assert "100% loss" in res.output or "Request timed out" in res.output


def test_prompt_tracks_mode_and_device():
    s, res = _run("net-vlan-001", ["enable"])
    assert res.prompt == "SW1# "
    s, res = _run("net-vlan-001", ["enable", "conf t"])
    assert res.prompt == "SW1(config)# "
    s, res = _run("net-vlan-001", ["enable", "conf t", "interface gi0/1"])
    assert res.prompt == "SW1(config-if)# "
    s, res = _run("net-vlan-001", ["connect R1"])
    assert res.prompt == "R1> "


def test_show_vlan_reflects_created_vlans():
    s, res = _run("net-vlan-001", ["enable", "conf t", "vlan 10", "name SALES", "end", "show vlan brief"])
    assert "SALES" in res.output and "10" in res.output


def test_unknown_ios_command_is_invalid():
    s, res = _run("net-vlan-001", ["enable", "flibbertigibbet"])
    assert "Invalid input" in res.output


def test_hostname_changes_the_prompt():
    s, res = _run("net-vlan-001", ["enable", "conf t", "hostname CORE"])
    assert res.prompt == "CORE(config)# "


# ---- Linux networking shell ----

def test_dns_lab_completes_via_terminal():
    s, _ = _run("net-dns-connectivity-001", [
        "ip addr", "dig app.corp.example", "ping 10.0.5.1", "traceroute app.corp.example", "curl -I http://app.corp.example",
    ])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_dig_unknown_host_times_out_and_records_nothing():
    r = linux_net.run(DNS, "dig nope.invalid", {})
    assert "connection timed out" in r.output and r.findings == {}


def test_curl_reports_200_and_records_service():
    r = linux_net.run(DNS, "curl -I http://app.corp.example", {})
    assert "200 OK" in r.output and r.findings["service"]["status"] == 200


# ---- API surface ----

def test_definitions_expose_terminal_seed_for_shell_labs():
    r = client.get("/api/labs/definitions")
    assert r.status_code == 200
    labs = {l["id"]: l for l in r.json()["labs"]}
    for lab_id in ("cyber-nmap-001", "net-vlan-001", "net-static-routing-001", "net-dns-connectivity-001"):
        assert "terminal" in labs[lab_id]
        assert labs[lab_id]["terminal"]["prompt"] and labs[lab_id]["terminal"]["banner"]
    # No provider internals leak.
    assert "cisco_ios" not in r.text and "_ios" not in r.text


def test_meta_prompts():
    assert meta(VLAN)["prompt"] == "SW1> "
    assert meta(DNS)["prompt"].startswith("student@workstation")
    assert cisco_ios.initial_prompt(STATIC) == "R1> "


# ---- ACL lab (Cisco IOS) ----

ACL_STEPS = [
    "enable", "conf t",
    "access-list 10 deny host 192.168.1.20", "access-list 10 permit any",
    "interface gi0/1", "ip access-group 10 out", "end",
]


def test_acl_lab_completes_and_filters_only_the_guest():
    s, _ = _run("net-acl-001", ACL_STEPS + ["connect GUEST", "ping 192.168.2.10", "connect PC1", "ping 192.168.2.10"])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_guest_ping_blocked_trusted_allowed_after_acl():
    _, guest = _run("net-acl-001", ACL_STEPS + ["connect GUEST", "ping 192.168.2.10"])
    assert "100% loss" in guest.output
    _, trusted = _run("net-acl-001", ACL_STEPS + ["connect PC1", "ping 192.168.2.10"])
    assert "0% loss" in trusted.output and "100% loss" not in trusted.output


def test_without_applying_acl_guest_is_not_blocked():
    # Rules created but never applied -> traffic still flows (objective stays open).
    s, _ = _run("net-acl-001", ["enable", "conf t", "access-list 10 deny host 192.168.1.20", "access-list 10 permit any", "end"])
    assert s.progress["deny-guest"] is True
    assert s.progress["apply"] is False
    assert s.progress["guest-blocked"] is False


def test_show_access_lists_reflects_rules():
    s, res = _run("net-acl-001", ["enable", "conf t", "access-list 10 deny host 192.168.1.20", "end", "show access-lists"])
    assert "access list 10" in res.output.lower() and "deny host 192.168.1.20" in res.output


def test_enable_twice_is_a_no_op():
    # Every firewall button sequence starts with `enable`; the old shell
    # rejected a second `enable` with "% Invalid input detected" — the banner
    # the playthrough saw after every button. Real IOS treats it as a no-op.
    _, res = _run("net-acl-001", ["enable", "enable"])
    assert "Invalid input" not in res.output
    assert res.exit_code == 0
    # The button pattern: enable, conf t, ..., end, enable again (apply).
    _, res = _run("net-acl-001", ["enable", "conf t",
                                  "access-list 10 deny host 192.168.1.20", "end", "enable"])
    assert "Invalid input" not in res.output
    assert res.exit_code == 0


def test_no_access_list_removes_the_whole_list():
    # The only rule removal the shell offers — the mission's deny-any wrong
    # move rebuilds list 10 on top of it.
    svc = SessionService()
    s = asyncio.run(svc.start("net-acl-001", "u1"))
    outs = []
    for c in ["enable", "conf t",
              "access-list 10 deny host 192.168.1.20", "access-list 10 permit any",
              "show access-lists",
              "no access-list 10",
              "show access-lists"]:
        s, res = asyncio.run(svc.exec_command(s.id, "u1", c))
        outs.append(res.output)
    assert "deny host 192.168.1.20" in outs[4]
    assert outs[6] == ""  # list 10 is gone entirely
    # Removing a list that was never created is a silent no-op, not an error.
    _, res = _run("net-acl-001", ["enable", "conf t", "no access-list 99", "end"])
    assert "Invalid input" not in res.output
    assert res.exit_code == 0


def test_rebuilt_acl_with_deny_any_ahead_of_permit_any_blocks_trusted():
    # First-match wins: deny-any must precede permit-any or the trusted PC
    # is never cut off (the old button appended deny-any after permit-any).
    _, trusted = _run("net-acl-001", [
        "enable", "conf t",
        "no access-list 10",
        "access-list 10 deny host 192.168.1.20",
        "access-list 10 deny any",
        "access-list 10 permit any",
        "interface gi0/1", "ip access-group 10 out", "end",
        "connect PC1", "ping 192.168.2.10",
    ])
    assert "100% loss" in trusted.output


def test_acl_walkthrough_never_exits_before_the_interface():
    # The `help` walkthrough for net-acl-001 used to say `exit | interface`:
    # `exit` in global config drops to privileged EXEC, where `interface` is
    # invalid — students following it could never apply the ACL. (`exit` from
    # an interface/vlan sub-mode is fine; it returns to global config.)
    from labs.shells.cisco_ios import _HELP_WALKTHROUGHS

    assert "exit | interface" not in _HELP_WALKTHROUGHS["net-acl-001"]


def test_concurrent_execs_on_one_session_both_land():
    # Regression for the live rapid-click bug: two execs racing the same
    # session must not lose one another's work. Each exec reads the
    # findings, mutates its own copy, and merges it back — without a
    # per-session lock the second merge overwrites the first (last-writer-
    # wins) and a command silently vanishes. The stub yields between the
    # read and the return, the way an I/O-backed provider (docker) does.
    import copy

    from labs.providers.base import CommandResult
    from labs.providers.mock import MockLabProvider

    class YieldingProvider(MockLabProvider):
        async def exec_command(self, environment_id, lab, command, findings):
            snapshot = copy.deepcopy(findings)
            await asyncio.sleep(0)  # yield: the other exec reads the same pre-state
            snapshot.setdefault("notes", [])
            snapshot["notes"].append(command)
            return CommandResult(output="ok", findings=snapshot)

    svc = SessionService(providers={"mock": YieldingProvider()})
    s = asyncio.run(svc.start("net-acl-001", "u1"))

    async def _both():
        await asyncio.gather(
            svc.exec_command(s.id, "u1", "first"),
            svc.exec_command(s.id, "u1", "second"),
        )

    asyncio.run(_both())
    notes = svc.get(s.id, "u1").findings.get("notes", [])
    assert sorted(notes) == ["first", "second"]


def test_deny_appended_after_permit_any_does_not_block_guest_but_rebuild_does():
    # Regression for the live rapid-click bug, second half: after the deny
    # was lost, the student re-added it AFTER permit-any and re-applied —
    # the rule showed in the read-back and acl_applied passed, yet the
    # guest still passed, because ACLs match top-down and permit-any fires
    # first. Only rebuilding the list with the deny first restores the
    # block (the fix the console's Deny button now issues).
    svc = SessionService()
    s = asyncio.run(svc.start("net-acl-001", "u1"))
    for c in ["enable", "conf t", "access-list 10 permit any", "end",
              "enable", "conf t", "access-list 10 deny host 192.168.1.20", "end",
              "enable", "conf t", "interface gi0/1", "ip access-group 10 out", "end"]:
        s, _ = asyncio.run(svc.exec_command(s.id, "u1", c))
    assert s.progress["deny-guest"] is True
    assert s.progress["apply"] is True
    assert s.progress["guest-blocked"] is False  # permit-any matches first
    for c in ["connect R1", "enable", "conf t", "no access-list 10",
              "access-list 10 deny host 192.168.1.20", "access-list 10 permit any", "end",
              "enable", "conf t", "interface gi0/1", "ip access-group 10 out", "end"]:
        s, _ = asyncio.run(svc.exec_command(s.id, "u1", c))
    assert s.progress["guest-blocked"] is True
    assert s.progress["trusted-allowed"] is True


# ---- Log triage lab (Linux logs shell) ----

LOG = get_lab("sec-logtriage-001")


def test_log_triage_lab_completes():
    s, _ = _run("sec-logtriage-001", [
        "cat auth.log", 'grep "Failed password" auth.log', "grep 203.0.113.66 auth.log",
        'grep "Accepted password" auth.log', "grep admin auth.log",
    ])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_grep_really_filters_and_handles_quotes():
    r = linux_logs.run(LOG, 'grep "Failed password" auth.log', {})
    lines = r.output.splitlines()
    assert lines and all("Failed password" in ln for ln in lines)
    assert r.findings.get("failed_found")


def test_grep_count_flag():
    r = linux_logs.run(LOG, "grep -c 203.0.113.66 auth.log", {})
    assert r.output.strip().isdigit() and int(r.output.strip()) > 1


def test_grep_no_match_is_silent_exit_1():
    r = linux_logs.run(LOG, "grep nonsense-token auth.log", {})
    assert r.output == "" and r.exit_code == 1 and r.findings == {}


def test_log_definitions_have_terminal_and_five_objectives():
    r = client.get("/api/labs/definitions")
    labs = {l["id"]: l for l in r.json()["labs"]}
    assert labs["net-acl-001"].get("terminal") and len(labs["net-acl-001"]["objectives"]) == 5
    assert labs["sec-logtriage-001"].get("terminal") and len(labs["sec-logtriage-001"]["objectives"]) == 5
