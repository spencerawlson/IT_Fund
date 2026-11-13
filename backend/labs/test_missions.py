"""Tests for Cyber Missions (vertical slice: op-broken-shield over net-acl-001)."""
import os
import sys
from pathlib import Path
from unittest import mock

os.environ["COOKIE_INSECURE"] = "1"  # allow the session cookie over http in tests

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import db
import main
import missions as missions_api
from auth.sessions import COOKIE_NAME, create_session
from db_models import User
from labs import api as labs_api
from labs import missions as mission_defs
from labs import sessions as sessions_mod
from labs.validators import VALIDATORS

client = TestClient(main.app)

MISSION_ID = "op-broken-shield"
DEVICES = ["R1", "PC1", "GUEST", "SRV"]
DOC = {
    "summary": "Guest host 192.168.1.20 was reaching the server LAN.",
    "root_cause": "The firewall ACL was empty, so all traffic was permitted.",
    "fix": "Added ACL 10 denying the guest and permitting all other traffic, applied outbound on Gi0/1.",
}

# Canonical IOS commands for net-acl-001 (see test_network_shells.py ACL_STEPS),
# plus the two proof pings that demonstrate the consequence.
ACL_COMMANDS = [
    "enable", "conf t",
    "access-list 10 deny host 192.168.1.20", "access-list 10 permit any",
    "interface gi0/1", "ip access-group 10 out", "end",
    "connect GUEST", "ping 192.168.2.10",
    "connect PC1", "ping 192.168.2.10",
]


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    client.cookies.clear()  # a guest cookie from a previous test must not leak into the next
    sessions_mod.service._sessions.clear()
    labs_api._check_start_rate.clear()
    labs_api._check_exec_rate.clear()
    missions_api._check_start_rate.clear()
    missions_api._check_action_rate.clear()
    sessions_mod.service._providers["mock"]._envs.clear()
    # These tests exercise mission mechanics, not billing: act as a subscribed
    # user so entitlement never interferes. Billing itself is covered by
    # test_mission_entitlement below (which pauses these patchers).
    setup_function._patchers = [
        mock.patch.object(labs_api, "is_subscribed", return_value=True),
        mock.patch.object(missions_api, "is_subscribed", return_value=True),
    ]
    for p in setup_function._patchers:
        p.start()


def teardown_function():
    for p in getattr(setup_function, "_patchers", []):
        p.stop()
    setup_function._patchers = []


def _user(uid: str):
    """Per-request session cookie for a real DB-backed session."""
    with db.SessionLocal() as s:
        if s.get(User, uid) is None:
            s.add(User(id=uid, display_name=uid, email=f"{uid}@example.com"))
            s.flush()
        raw = create_session(s, uid)
        s.commit()
    return {COOKIE_NAME: raw}


def _guest():
    """A fresh anonymous browser: its own cookie jar."""
    return TestClient(main.app)


def _start(c, cookies):
    r = c.post(f"/api/missions/{MISSION_ID}/start", cookies=cookies)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["attempt"]["status"] == "in_progress"
    assert body["attempt"]["mission_id"] == MISSION_ID
    assert body["session"]["lab_id"] == "net-acl-001"
    assert body["mission"]["callsign"] == "OPERATION BROKEN SHIELD"
    return body["attempt"]["id"], body["session"]["id"]


def _exec(c, cookies, sid, command):
    r = c.post(f"/api/labs/sessions/{sid}/exec", json={"command": command}, cookies=cookies)
    assert r.status_code == 200, r.text
    return r.json()


def _exec_many(c, cookies, sid, commands):
    for cmd in commands:
        _exec(c, cookies, sid, cmd)


def _action(c, cookies, aid, payload):
    return c.post(f"/api/missions/attempts/{aid}/action", json=payload, cookies=cookies)


def _get_attempt(c, cookies, aid):
    r = c.get(f"/api/missions/attempts/{aid}", cookies=cookies)
    assert r.status_code == 200, r.text
    return r.json()


def _objectives_by_id(view):
    return {o["id"]: o for o in view["objectives"]}


def _do_mission_work(c, cookies, aid, sid):
    """Drive one attempt through every objective except the final complete."""
    for device in DEVICES:
        r = _action(c, cookies, aid, {"type": "inspect_device", "device": device})
        assert r.status_code == 200, r.text
    r = _action(c, cookies, aid, {"type": "inspect_firewall"})
    assert r.status_code == 200, r.text
    _exec_many(c, cookies, sid, ACL_COMMANDS)
    r = c.post(f"/api/labs/sessions/{sid}/validate", cookies=cookies)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "COMPLETED"
    r = _action(c, cookies, aid, {"type": "document", **DOC})
    assert r.status_code == 200, r.text
    r = _action(c, cookies, aid, {"type": "submit_report"})
    assert r.status_code == 200, r.text


def _complete(c, cookies, aid):
    r = c.post(f"/api/missions/attempts/{aid}/complete", cookies=cookies)
    assert r.status_code == 200, r.text
    return r.json()


# ---- mission-only validators (fixed findings) ----

def _mission_findings(**overrides):
    f = mission_defs.initial_findings()
    for key, value in overrides.items():
        f[key] = value
    return f


def test_topology_inspected_validator():
    args = {"devices": DEVICES}
    passed, _m, _e = VALIDATORS["topology_inspected"](args, _mission_findings())
    assert not passed
    f = _mission_findings(topology={"inspected": ["R1", "PC1"]})
    passed, msg, _e = VALIDATORS["topology_inspected"](args, f)
    assert not passed and "GUEST" in msg
    f = _mission_findings(topology={"inspected": list(DEVICES)})
    passed, _m, _e = VALIDATORS["topology_inspected"](args, f)
    assert passed


def test_firewall_policy_inspected_validator():
    passed, _m, _e = VALIDATORS["firewall_policy_inspected"]({}, _mission_findings())
    assert not passed
    f = _mission_findings(firewall={"inspected": True})
    passed, _m, _e = VALIDATORS["firewall_policy_inspected"]({}, f)
    assert passed


def test_incident_documented_validator_boundary():
    short = "x" * 19
    exact = "x" * 20
    base = {"summary": exact, "root_cause": exact, "fix": exact, "submitted": False}
    passed, _m, _e = VALIDATORS["incident_documented"]({}, _mission_findings(incident_report=base))
    assert passed
    for key in ("summary", "root_cause", "fix"):
        bad = dict(base, **{key: short})
        passed, msg, _e = VALIDATORS["incident_documented"]({}, _mission_findings(incident_report=bad))
        assert not passed and key in msg
    # Whitespace does not count: 20 spaces is still too short.
    blank = dict(base, summary=" " * 20)
    passed, _m, _e = VALIDATORS["incident_documented"]({}, _mission_findings(incident_report=blank))
    assert not passed


def test_incident_report_submitted_validator():
    passed, _m, _e = VALIDATORS["incident_report_submitted"]({}, _mission_findings())
    assert not passed
    f = _mission_findings(incident_report={"summary": "x" * 20, "root_cause": "x" * 20, "fix": "x" * 20, "submitted": True})
    passed, _m, _e = VALIDATORS["incident_report_submitted"]({}, f)
    assert passed


# ---- registry / catalogue ----

def test_mission_definition_references_only_registered_validators():
    definition = mission_defs.get_mission(MISSION_ID)
    assert definition is not None
    assert definition.version == 1
    assert definition.lab_id == "net-acl-001"
    assert definition.lesson_id == "net-security"
    assert definition.cissp_domain == 4
    assert len(definition.all_objectives()) == 9  # 5 lab + 4 mission-only
    for obj in definition.all_objectives():
        assert obj.validator in VALIDATORS, f"{obj.id} -> unknown validator {obj.validator}"


def test_definitions_hide_validator_internals():
    h = _user("cat1")
    r = client.get("/api/missions/definitions", cookies=h)
    assert r.status_code == 200
    missions = r.json()["missions"]
    assert len(missions) == 1 and missions[0]["id"] == MISSION_ID
    assert missions[0]["callsign"] == "OPERATION BROKEN SHIELD"
    assert "validator" not in r.text
    r = client.get(f"/api/missions/{MISSION_ID}", cookies=h)
    assert r.status_code == 200
    body = r.json()
    assert body["briefing"][0].startswith("Orion Technologies")
    assert len(body["briefing"]) == 4
    # The 4th line makes the terminal the instructed way to check progress:
    # `objectives` lists [x]/[ ], `progress` counts, `hint` names the next step.
    assert "objectives" in body["briefing"][3] and "progress" in body["briefing"][3]
    assert "hint" in body["briefing"][3]
    assert len(body["objectives"]) == 9
    assert body["scoring"] == {"per_objective": 10, "completion_bonus": 10}
    assert body["debrief_win"].startswith("Mission complete, Agent.")
    assert "validator" not in r.text and "topology_inspected" not in r.text
    assert client.get("/api/missions/nope", cookies=h).status_code == 404


# ---- full §8.5 flow ----

def test_start_returns_all_nine_objectives_unpassed():
    # The workspace renders its checklist from the start response — if the
    # objectives were missing, the list would be empty and the report form's
    # client-side gate would pass vacuously.
    h = _user("start-objectives")
    r = client.post(f"/api/missions/{MISSION_ID}/start", cookies=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["objectives"]) == 9
    assert {o["id"] for o in body["objectives"]} == {
        "deny-guest", "permit-others", "apply", "guest-blocked", "trusted-allowed",
        "topology", "firewall-inspect", "document", "report",
    }
    assert all(o["passed"] is False for o in body["objectives"])


def test_full_mission_flow_scores_100_and_awards_80_xp():
    h = _user("flow1")
    aid, sid = _start(client, h)
    _do_mission_work(client, h, aid, sid)
    view = _get_attempt(client, h, aid)
    assert len(view["objectives"]) == 9
    assert all(o["passed"] for o in view["objectives"]), view["objectives"]
    result = _complete(client, h, aid)
    assert result["score"] == 100
    assert result["xp_awarded"] == 80
    assert result["attempt"]["status"] == "completed"
    assert result["attempt"]["score"] == 100
    assert result["debrief"].startswith("Mission complete, Agent.")
    hist = client.get("/api/missions/history", cookies=h).json()["history"]
    assert len(hist) == 1
    assert hist[0]["id"] == aid
    assert hist[0]["mission_id"] == MISSION_ID
    assert hist[0]["status"] == "completed"
    assert hist[0]["score"] == 100 and hist[0]["xp_awarded"] == 80


def test_complete_too_early_lists_missing_objectives():
    h = _user("early1")
    aid, _sid = _start(client, h)
    r = client.post(f"/api/missions/attempts/{aid}/complete", cookies=h)
    assert r.status_code == 400
    assert set(r.json()["missing"]) == {
        "deny-guest", "permit-others", "apply", "guest-blocked", "trusted-allowed",
        "topology", "firewall-inspect", "document", "report",
    }


def test_submit_report_blocked_until_everything_else_passes():
    h = _user("gate1")
    aid, sid = _start(client, h)
    r = _action(client, h, aid, {"type": "submit_report"})
    assert r.status_code == 400
    assert "topology" in r.json()["missing"] and "deny-guest" in r.json()["missing"]
    # Lab done but mission investigation not: still blocked, and only the
    # mission objectives are missing.
    _exec_many(client, h, sid, ACL_COMMANDS)
    r = _action(client, h, aid, {"type": "submit_report"})
    assert r.status_code == 400
    assert set(r.json()["missing"]) == {"topology", "firewall-inspect", "document"}


# ---- wrong-rule consequence + recovery ----

def test_deny_all_blocks_trusted_then_corrected_acl_restores_it():
    h = _user("wrong1")
    aid, sid = _start(client, h)
    # Deny-all, applied, no permit-any: the guest is blocked — and so is everyone else.
    _exec_many(client, h, sid, [
        "enable", "conf t",
        "access-list 10 deny any",
        "interface gi0/1", "ip access-group 10 out", "end",
    ])
    view = _get_attempt(client, h, aid)
    objs = _objectives_by_id(view)
    assert objs["guest-blocked"]["passed"] is True
    assert objs["trusted-allowed"]["passed"] is False  # the visible consequence
    # The fix is a corrected ACL with permit-any, applied in place of the
    # deny-all one (access-group replaces) — the same recovery the
    # "Recover with ACL 20" button sends.
    _exec_many(client, h, sid, [
        "enable", "conf t",
        "access-list 20 deny host 192.168.1.20", "access-list 20 permit any",
        "interface gi0/1", "ip access-group 20 out", "end",
    ])
    view = _get_attempt(client, h, aid)
    objs = _objectives_by_id(view)
    assert objs["trusted-allowed"]["passed"] is True
    assert objs["guest-blocked"]["passed"] is True
    assert all(objs[o]["passed"] for o in ("deny-guest", "permit-others", "apply"))


# ---- determinism + replay (no double XP) ----

def test_same_findings_give_same_score_on_two_attempts():
    scores = []
    for uid in ("det1", "det2"):
        h = _user(uid)
        aid, sid = _start(client, h)
        _do_mission_work(client, h, aid, sid)
        scores.append(_complete(client, h, aid)["score"])
    assert scores == [100, 100]


def test_second_completion_awards_no_xp():
    h = _user("replay1")
    aid, sid = _start(client, h)
    _do_mission_work(client, h, aid, sid)
    assert _complete(client, h, aid)["xp_awarded"] == 80
    # Re-completing the SAME attempt is idempotent: same stored XP, no re-award.
    again = _complete(client, h, aid)
    assert again["xp_awarded"] == 80 and again["score"] == 100
    # A NEW attempt for the same user completes for full score but zero XP.
    aid2, sid2 = _start(client, h)
    _do_mission_work(client, h, aid2, sid2)
    second = _complete(client, h, aid2)
    assert second["score"] == 100
    assert second["xp_awarded"] == 0


# ---- entitlement + isolation + action validation ----

def test_mission_entitlement():
    # Anonymous visitors get 401 on every missions endpoint.
    g = _guest()
    assert g.get("/api/missions/definitions").status_code == 401
    assert g.get(f"/api/missions/{MISSION_ID}").status_code == 401
    assert g.get("/api/missions/history").status_code == 401
    assert g.post(f"/api/missions/{MISSION_ID}/start").status_code == 401
    # Signed-in but unsubscribed users get 402.
    for p in setup_function._patchers:
        p.stop()
    try:
        with mock.patch.object(missions_api, "is_subscribed", return_value=False):
            h = _user("nonsub1")
            assert client.get("/api/missions/definitions", cookies=h).status_code == 402
            assert client.get(f"/api/missions/{MISSION_ID}", cookies=h).status_code == 402
            assert client.get("/api/missions/history", cookies=h).status_code == 402
            assert client.post(f"/api/missions/{MISSION_ID}/start", cookies=h).status_code == 402
    finally:
        for p in setup_function._patchers:
            p.start()


def test_attempt_isolation_and_action_validation():
    a = _user("alice-m")
    b = _user("bob-m")
    aid, sid = _start(client, a)
    # Another user's attempt reads as 404, never as someone else's data.
    assert client.get(f"/api/missions/attempts/{aid}", cookies=b).status_code == 404
    assert _action(client, b, aid, {"type": "inspect_firewall"}).status_code == 404
    assert client.post(f"/api/missions/attempts/{aid}/complete", cookies=b).status_code == 404
    # Unknown action type, unknown device, oversize / mistyped document fields.
    assert _action(client, a, aid, {"type": "explode"}).status_code == 400
    assert _action(client, a, aid, {"type": "inspect_device", "device": "SW1"}).status_code == 400
    assert _action(client, a, aid, {"type": "document", **DOC, "summary": "x" * 2001}).status_code == 400
    assert _action(client, a, aid, {"type": "document", **DOC, "fix": 42}).status_code == 400
    # Inspecting the same device twice dedupes; choices log the action.
    _action(client, a, aid, {"type": "inspect_device", "device": "R1"})
    _action(client, a, aid, {"type": "inspect_device", "device": "R1"})
    view = _get_attempt(client, a, aid)
    assert view["attempt"]["findings"]["topology"]["inspected"] == ["R1"]
    assert len([c for c in view["attempt"]["choices"] if c.get("device") == "R1"]) == 2
    # Actions on a completed attempt are a 409.
    _do_mission_work(client, a, aid, sid)
    _complete(client, a, aid)
    assert _action(client, a, aid, {"type": "inspect_firewall"}).status_code == 409


def test_history_is_user_scoped():
    h = _user("hist-m1")
    aid, sid = _start(client, h)
    _do_mission_work(client, h, aid, sid)
    _complete(client, h, aid)
    assert client.get("/api/missions/history", cookies=_user("hist-m2")).json() == {"history": []}


# ---- resume on reload (defect: reload started a fresh attempt at 0/9) ----

def test_start_resumes_in_progress_attempt_instead_of_starting_a_new_one():
    h = _user("resume1")
    aid, sid = _start(client, h)
    for device in DEVICES:
        r = _action(client, h, aid, {"type": "inspect_device", "device": device})
        assert r.status_code == 200, r.text
    # "Reload": POST /start again — same attempt, same session, no new attempt.
    r = client.post(f"/api/missions/{MISSION_ID}/start", cookies=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("resumed") is True
    assert body["attempt"]["id"] == aid
    assert body["session"]["id"] == sid
    view = _get_attempt(client, h, aid)
    objs = _objectives_by_id(view)
    assert objs["topology"]["passed"] is True  # inspection state survived the "reload"
    hist = client.get("/api/missions/history", cookies=h).json()["history"]
    assert len(hist) == 1


def test_start_after_dead_session_abandons_and_starts_fresh():
    h = _user("resume2")
    aid, sid = _start(client, h)
    sessions_mod.service._sessions.pop(sid, None)  # session expired/destroyed
    r = client.post(f"/api/missions/{MISSION_ID}/start", cookies=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("resumed") is not True
    assert body["attempt"]["id"] != aid
    assert body["attempt"]["status"] == "in_progress"
    hist = client.get("/api/missions/history", cookies=h).json()["history"]
    assert len(hist) == 2
    old = next(x for x in hist if x["id"] == aid)
    assert old["status"] == "abandoned"


# ---- deny-any button sequence (defect: deny-any appended after permit-any) ----

def test_frontend_deny_any_sequence_blocks_trusted_then_acl20_recovers():
    h = _user("denyany1")
    aid, sid = _start(client, h)
    # Exactly what the "Try deny-any" firewall button sends: the withR1Connect
    # prefix, the rebuilt ACL 10 (deny-any ahead of permit-any), then apply.
    _exec_many(client, h, sid, [
        "connect R1", "enable", "configure terminal",
        "no access-list 10",
        "access-list 10 deny host 192.168.1.20",
        "access-list 10 deny any",
        "access-list 10 permit any",
        "end",
        "enable", "configure terminal",
        "interface gi0/1", "ip access-group 10 out", "end",
        "connect GUEST", "ping 192.168.2.10",
        "connect PC1", "ping 192.168.2.10",
    ])
    view = _get_attempt(client, h, aid)
    objs = _objectives_by_id(view)
    assert objs["guest-blocked"]["passed"] is True
    assert objs["trusted-allowed"]["passed"] is False  # the outage the button promises
    # "Recover with ACL 20" (buildRecoverAcl20Commands) must still work after.
    _exec_many(client, h, sid, [
        "connect R1", "enable", "configure terminal",
        "access-list 20 deny host 192.168.1.20", "access-list 20 permit any",
        "interface gi0/1", "ip access-group 20 out", "end",
        "connect GUEST", "ping 192.168.2.10",
        "connect PC1", "ping 192.168.2.10",
    ])
    view = _get_attempt(client, h, aid)
    objs = _objectives_by_id(view)
    assert objs["trusted-allowed"]["passed"] is True
    assert objs["guest-blocked"]["passed"] is True
