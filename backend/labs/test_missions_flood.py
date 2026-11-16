"""Tests for Cyber Mission op-packet-flood over tools-wireshark-001.

Mirrors test_missions.py (op-broken-shield): the same mechanics — full flow,
XP keyed to the mission, report gated until everything else passes — over a
different shape: a terminal-only mission whose lab objectives are
attestation-based ("I did this" in the container) and whose mission-only
finding is the flooding host + flood type, checked against the ground truth
baked into flood.pcap (never the tool used).

No Docker daemon needed: backend/conftest.py routes the "docker" provider
name to the mock provider, so start/validate run without a container; the
attestation path is the same one a real learner's "I did this" takes
(record_findings + validate).
"""
import os
import sys
from pathlib import Path
from unittest import mock

os.environ["COOKIE_INSECURE"] = "1"  # allow the session cookie over http in tests

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlalchemy import select
import db
import main
import missions as missions_api
from auth.sessions import COOKIE_NAME, create_session
from db_models import LabCompletion, User
from labs import api as labs_api
from labs import missions as mission_defs
from labs import sessions as sessions_mod
from labs.validators import VALIDATORS

client = TestClient(main.app)

MISSION_ID = "op-packet-flood"
LAB_ID = "tools-wireshark-001"
DOC = {
    "summary": "The intranet barely responded — one internal host was flooding the web server.",
    "root_cause": "A single host sent a burst of SYNs with no handshake; the server backlog filled.",
    "fix": "Blocked the flooding host and rate-limited SYNs, then verified the intranet responds.",
}
FLOOD_REPORT = {"source_ip": "10.10.10.9", "flood_type": "SYN flood"}

# The six wireshark lab objectives, in definition order (see sectools.py).
WS_VALIDATORS = [
    "ws_capture_opened", "ws_protocols_identified", "ws_tcp_stream_followed",
    "ws_credentials_found", "ws_dns_exfil_found", "ws_report_written",
]
ALL_OBJECTIVE_IDS = {
    "open", "protocols", "stream", "creds", "exfil", "writeup",
    "flood-source", "document", "report",
}


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
    # user so entitlement never interferes.
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


def _start(c, cookies):
    r = c.post(f"/api/missions/{MISSION_ID}/start", cookies=cookies)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["attempt"]["status"] == "in_progress"
    assert body["attempt"]["mission_id"] == MISSION_ID
    assert body["session"]["lab_id"] == LAB_ID
    assert body["mission"]["callsign"] == "OPERATION PACKET FLOOD"
    return body["attempt"]["id"], body["session"]["id"]


def _action(c, cookies, aid, payload):
    return c.post(f"/api/missions/attempts/{aid}/action", json=payload, cookies=cookies)


def _get_attempt(c, cookies, aid):
    r = c.get(f"/api/missions/attempts/{aid}", cookies=cookies)
    assert r.status_code == 200, r.text
    return r.json()


def _objectives_by_id(view):
    return {o["id"]: o for o in view["objectives"]}


def _attest_lab_objectives(c, cookies, sid):
    """The learner's "I did this" for each wireshark lab objective, then
    re-validate — the same record_findings + validate step the workspace's
    attestation buttons perform."""
    for validator in WS_VALIDATORS:
        r = c.post(f"/api/labs/sessions/{sid}/findings",
                   json={"findings": {validator: {"attested": True}}}, cookies=cookies)
        assert r.status_code == 200, r.text
    r = c.post(f"/api/labs/sessions/{sid}/validate", cookies=cookies)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "COMPLETED"


def _do_mission_work(c, cookies, aid, sid):
    """Drive one attempt through every objective except the final complete."""
    _attest_lab_objectives(c, cookies, sid)
    r = _action(c, cookies, aid, {"type": "report_flooder", **FLOOD_REPORT})
    assert r.status_code == 200, r.text
    r = _action(c, cookies, aid, {"type": "document", **DOC})
    assert r.status_code == 200, r.text
    r = _action(c, cookies, aid, {"type": "submit_report"})
    assert r.status_code == 200, r.text


def _complete(c, cookies, aid):
    r = c.post(f"/api/missions/attempts/{aid}/complete", cookies=cookies)
    assert r.status_code == 200, r.text
    return r.json()


# ---- flood validator (fixed findings) ----

def _flood_findings(source_ip="", flood_type=""):
    f = mission_defs.initial_findings()
    f["flood"] = {"source_ip": source_ip, "flood_type": flood_type}
    return f


def _flood_args():
    return {"source_ip": "10.10.10.9", "flood_types": ["syn flood", "tcp syn flood", "syn"]}


def test_flood_source_identified_validator():
    args = _flood_args()
    passed, msg, _e = VALIDATORS["flood_source_identified"](args, _flood_findings())
    assert not passed and "Report" in msg
    # Wrong host: fails, and the message says which half is wrong without
    # revealing the answer.
    passed, msg, _e = VALIDATORS["flood_source_identified"](
        args, _flood_findings("10.10.10.5", "syn flood"))
    assert not passed and "10.10.10.5" in msg and "10.10.10.9" not in msg
    # Right host, wrong kind: fails on the type half only.
    passed, msg, _e = VALIDATORS["flood_source_identified"](
        args, _flood_findings("10.10.10.9", "udp flood"))
    assert not passed and "kind of flood" in msg
    # Spelling variants of the same answer all pass.
    for spelling in ("syn flood", "SYN flood", "SYN-flood", "tcp syn flood", "syn"):
        passed, _m, _e = VALIDATORS["flood_source_identified"](
            args, _flood_findings("10.10.10.9", spelling))
        assert passed, spelling


# ---- registry / catalogue ----

def test_mission_definition_references_only_registered_validators():
    definition = mission_defs.get_mission(MISSION_ID)
    assert definition is not None
    assert definition.version == 1
    assert definition.lab_id == LAB_ID
    assert definition.lesson_id == "net-troubleshoot"
    assert definition.cissp_domain == 4
    assert definition.xp == 80
    assert len(definition.all_objectives()) == 9  # 6 lab + 3 mission-only
    assert {o.id for o in definition.all_objectives()} == ALL_OBJECTIVE_IDS
    for obj in definition.all_objectives():
        assert obj.validator in VALIDATORS, f"{obj.id} -> unknown validator {obj.validator}"
    # The flood ground truth is the capture's: one host, one flood type.
    flood_obj = next(o for o in definition.objectives if o.id == "flood-source")
    assert flood_obj.args["source_ip"] == "10.10.10.9"
    assert "syn flood" in flood_obj.args["flood_types"]


def test_definitions_list_both_missions_and_hide_validator_internals():
    h = _user("cat-flood")
    r = client.get("/api/missions/definitions", cookies=h)
    assert r.status_code == 200
    missions = r.json()["missions"]
    assert {m["id"] for m in missions} == {"op-broken-shield", MISSION_ID}
    flood = next(m for m in missions if m["id"] == MISSION_ID)
    assert flood["callsign"] == "OPERATION PACKET FLOOD"
    assert flood["lab_id"] == LAB_ID
    assert flood["lesson_id"] == "net-troubleshoot"
    assert flood["xp"] == 80
    assert "validator" not in r.text
    r = client.get(f"/api/missions/{MISSION_ID}", cookies=h)
    assert r.status_code == 200
    body = r.json()
    assert body["briefing"][0].startswith("Orion Technologies")
    assert len(body["briefing"]) == 4
    assert "objectives" in body["briefing"][3] and "progress" in body["briefing"][3]
    assert "hint" in body["briefing"][3]
    assert len(body["objectives"]) == 9
    assert body["scoring"] == {"per_objective": 10, "completion_bonus": 10}
    assert body["debrief_win"].startswith("Mission complete, Agent.")
    assert "validator" not in r.text and "flood_source_identified" not in r.text


# ---- full flow ----

def test_start_returns_all_nine_objectives_unpassed():
    h = _user("start-flood")
    r = client.post(f"/api/missions/{MISSION_ID}/start", cookies=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["objectives"]) == 9
    assert {o["id"] for o in body["objectives"]} == ALL_OBJECTIVE_IDS
    assert all(o["passed"] is False for o in body["objectives"])


def test_full_mission_flow_scores_100_and_awards_80_xp():
    h = _user("flow-flood")
    aid, sid = _start(client, h)
    _do_mission_work(client, h, aid, sid)
    view = _get_attempt(client, h, aid)
    assert len(view["objectives"]) == 9
    assert all(o["passed"] for o in view["objectives"]), view["objectives"]
    result = _complete(client, h, aid)
    assert result["score"] == 100
    assert result["xp_awarded"] == mission_defs.get_mission(MISSION_ID).xp == 80
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
    h = _user("early-flood")
    aid, _sid = _start(client, h)
    r = client.post(f"/api/missions/attempts/{aid}/complete", cookies=h)
    assert r.status_code == 400
    assert set(r.json()["missing"]) == ALL_OBJECTIVE_IDS


def test_submit_report_blocked_until_everything_else_passes():
    h = _user("gate-flood")
    aid, sid = _start(client, h)
    r = _action(client, h, aid, {"type": "submit_report"})
    assert r.status_code == 400
    assert "flood-source" in r.json()["missing"] and "open" in r.json()["missing"]
    # Lab done + flooder reported, report not yet documented: only the
    # document objective is missing.
    _attest_lab_objectives(client, h, sid)
    r = _action(client, h, aid, {"type": "report_flooder", **FLOOD_REPORT})
    assert r.status_code == 200, r.text
    r = _action(client, h, aid, {"type": "submit_report"})
    assert r.status_code == 400
    assert r.json()["missing"] == ["document"]


# ---- the flood finding: wrong, then right ----

def test_wrong_flood_report_stays_open_then_correct_one_passes():
    h = _user("wrong-flood")
    aid, _sid = _start(client, h)
    # A wrong report is stored, not an error: the action succeeds and the
    # objective stays open with the validator's message.
    r = _action(client, h, aid, {"type": "report_flooder",
                                 "source_ip": "10.10.10.5", "flood_type": "syn flood"})
    assert r.status_code == 200, r.text
    view = _get_attempt(client, h, aid)
    objs = _objectives_by_id(view)
    assert objs["flood-source"]["passed"] is False
    assert "10.10.10.5" in objs["flood-source"]["message"]
    assert view["attempt"]["findings"]["flood"] == {"source_ip": "10.10.10.5", "flood_type": "syn flood"}
    # Right host, wrong kind: still open.
    r = _action(client, h, aid, {"type": "report_flooder",
                                 "source_ip": "10.10.10.9", "flood_type": "udp flood"})
    assert r.status_code == 200, r.text
    view = _get_attempt(client, h, aid)
    assert _objectives_by_id(view)["flood-source"]["passed"] is False
    # The correct finding passes — and re-reporting it is a no-op pass.
    r = _action(client, h, aid, {"type": "report_flooder", **FLOOD_REPORT})
    assert r.status_code == 200, r.text
    view = _get_attempt(client, h, aid)
    assert _objectives_by_id(view)["flood-source"]["passed"] is True


def test_report_flooder_validation():
    h = _user("val-flood")
    aid, _sid = _start(client, h)
    assert _action(client, h, aid, {"type": "report_flooder",
                                    "source_ip": 42, "flood_type": "syn flood"}).status_code == 400
    assert _action(client, h, aid, {"type": "report_flooder",
                                    "source_ip": "x" * 65, "flood_type": "syn flood"}).status_code == 400
    assert _action(client, h, aid, {"type": "report_flooder",
                                    "source_ip": "10.10.10.9", "flood_type": "x" * 65}).status_code == 400
    # Broken Shield has no flood to report: the same action is a 400 there.
    r = client.post("/api/missions/op-broken-shield/start", cookies=h)
    assert r.status_code == 200, r.text
    shield_aid = r.json()["attempt"]["id"]
    assert _action(client, h, shield_aid, {"type": "report_flooder", **FLOOD_REPORT}).status_code == 400


# ---- determinism + replay (no double XP) ----

def test_second_completion_awards_no_xp():
    h = _user("replay-flood")
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


def test_prior_standalone_lab_completion_still_earns_full_mission_xp():
    uid = "labfirst-flood"
    h = _user(uid)
    # Complete the wireshark lab standalone first (attestation-based): a
    # LabCompletion row for this lab exists before the mission starts.
    r = client.post(f"/api/labs/{LAB_ID}/start", cookies=h)
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    _attest_lab_objectives(client, h, sid)
    with db.SessionLocal() as s:
        row = s.execute(
            select(LabCompletion.id).where(
                LabCompletion.user_id == uid,
                LabCompletion.lab_id == LAB_ID,
            )
        ).first()
    assert row is not None
    aid, sid = _start(client, h)
    _do_mission_work(client, h, aid, sid)
    result = _complete(client, h, aid)
    assert result["score"] == 100
    assert result["xp_awarded"] == mission_defs.get_mission(MISSION_ID).xp == 80
