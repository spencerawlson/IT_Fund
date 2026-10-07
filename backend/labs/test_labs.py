import os
import sys
from datetime import timedelta
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"  # allow the session cookie over http in tests

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlalchemy import func, select
import db
import main
from auth.sessions import COOKIE_NAME, create_session
from db_models import LabCompletion, User
from auth.deps import GUEST_COOKIE, _GUEST_TOKEN
from labs import api as labs_api
from labs import sessions as sessions_mod
from labs.registry import LABS
from labs.sessions import _now

client = TestClient(main.app)


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    client.cookies.clear()  # a guest cookie from a previous test must not leak into the next
    sessions_mod.service._sessions.clear()
    labs_api._check_start_rate.clear()
    labs_api._check_exec_rate.clear()
    sessions_mod.service._providers["mock"]._envs.clear()


def _user(uid: str):
    """Per-request session cookie for a real DB-backed session (two users => two cookies)."""
    with db.SessionLocal() as s:
        if s.get(User, uid) is None:
            s.add(User(id=uid, display_name=uid, email=f"{uid}@example.com"))
            s.flush()
        raw = create_session(s, uid)
        s.commit()
    return {COOKIE_NAME: raw}


def _guest():
    """A fresh anonymous browser: its own cookie jar, so guest ids differ between clients."""
    return TestClient(main.app)


PORTS = {"findings": {"hosts": {"target.lab": {"up": True}},
                      "ports": [{"target": "target.lab", "port": 22, "service": "ssh", "version": "OpenSSH 9.6"},
                                {"target": "target.lab", "port": 80, "service": "http", "version": "nginx 1.25"}]}}


# ---- definitions ----

def test_definitions_load_and_hide_internals():
    assert "cyber-nmap-001" in LABS and "net-vlan-001" in LABS
    r = client.get("/api/labs/definitions")
    assert r.status_code == 200
    labs = r.json()["labs"]
    assert any(l["id"] == "cyber-nmap-001" for l in labs)
    # The internal image and provider FIELDS are never exposed to the client. (Educational text may
    # legitimately mention e.g. "the AWS provider", so check the JSON keys/values, not the bare word.)
    blob = r.text
    assert "security-tools:latest" not in blob
    assert '"provider"' not in blob and '"image"' not in blob
    assert '"mock"' not in blob


# ---- live-execution flag ----

def test_public_view_marks_live_labs_without_leaking_internals():
    r = client.get("/api/labs/definitions")
    assert r.status_code == 200
    labs = {l["id"]: l for l in r.json()["labs"]}
    basics = labs["py-basics-001"]
    # TEMPORARY (2026-10-07): py-basics-001 is back on the mock provider until the
    # Docker daemon runs on FedSer, so it must NOT claim to be live. Flip this
    # assertion back to `is True` when the lab returns to provider="docker".
    assert basics["environment"]["live"] is False
    # Simulated labs stay non-live...
    assert labs["cyber-nmap-001"]["environment"]["live"] is False
    # ...and objectives carry their (opaque) validator keys so the UI can record
    # attested findings for live labs.
    by_id = {o["id"]: o for o in basics["objectives"]}
    assert by_id["write-script"]["validator"] == "py_script_written"
    # Still no provider/image internals in the public blob.
    blob = r.text
    assert '"provider"' not in blob and '"image"' not in blob


# ---- server-side lab history ----

def _complete_nmap(c, cookie):
    """Drive cyber-nmap-001 to COMPLETED through the API, returning the session."""
    r = c.post("/api/labs/cyber-nmap-001/start", cookies=cookie)
    assert r.status_code == 200
    sid = r.json()["id"]
    c.post(f"/api/labs/sessions/{sid}/findings", json=PORTS, cookies=cookie)
    r = c.post(f"/api/labs/sessions/{sid}/validate", cookies=cookie)
    assert r.json()["status"] == "COMPLETED"
    return r.json()


def _completion_count(user_id):
    with db.SessionLocal() as s:
        return s.execute(
            select(func.count()).select_from(LabCompletion)
            .where(LabCompletion.user_id == user_id)
        ).scalar()


def test_completion_is_recorded_for_signed_in_users():
    h = _user("hist1")
    sess = _complete_nmap(client, h)
    with db.SessionLocal() as s:
        rows = s.execute(
            select(LabCompletion).where(LabCompletion.user_id == "hist1")
        ).scalars().all()
    assert len(rows) == 1
    row = rows[0]
    assert row.lab_id == "cyber-nmap-001"
    assert row.session_id == sess["id"]
    assert row.duration_seconds >= 0
    assert row.completed_at is not None


def test_completion_recording_is_idempotent():
    h = _user("hist2")
    sess = _complete_nmap(client, h)
    sid = sess["id"]
    # Repeat validations — and an exec on the completed session — must not
    # create more rows for the same session.
    client.post(f"/api/labs/sessions/{sid}/validate", cookies=h)
    client.post(f"/api/labs/sessions/{sid}/validate", cookies=h)
    client.post(f"/api/labs/sessions/{sid}/exec", json={"command": "help"}, cookies=h)
    assert _completion_count("hist2") == 1


def test_guest_completions_are_not_recorded():
    g = _guest()
    _complete_nmap(g, {})
    with db.SessionLocal() as s:
        n = s.execute(select(func.count()).select_from(LabCompletion)).scalar()
    assert n == 0


def test_history_endpoint_needs_sign_in_and_is_user_scoped():
    assert _guest().get("/api/labs/history").status_code == 401
    h = _user("hist3")
    r = client.get("/api/labs/history", cookies=h)
    assert r.status_code == 200 and r.json() == {"history": []}
    _complete_nmap(client, h)
    hist = client.get("/api/labs/history", cookies=h).json()["history"]
    assert len(hist) == 1
    assert hist[0]["lab_id"] == "cyber-nmap-001"
    assert isinstance(hist[0]["duration_seconds"], int)
    assert hist[0]["completed_at"]
    # Another signed-in learner sees none of it.
    r = client.get("/api/labs/history", cookies=_user("hist4"))
    assert r.json() == {"history": []}


# ---- auth + lifecycle ----

def test_start_is_open_to_anonymous_visitors():
    # Labs are open during development: no account needed, just a guest cookie to own the session.
    r = client.post("/api/labs/cyber-nmap-001/start")
    assert r.status_code == 200 and r.json()["status"] == "RUNNING"
    assert GUEST_COOKIE in r.cookies
    sid = r.json()["id"]
    assert client.get(f"/api/labs/sessions/{sid}").status_code == 200  # same jar, same guest


def test_one_guest_cannot_touch_another_guests_session():
    a, b = _guest(), _guest()
    sid = a.post("/api/labs/cyber-nmap-001/start").json()["id"]
    assert b.get(f"/api/labs/sessions/{sid}").status_code == 404
    assert b.post(f"/api/labs/sessions/{sid}/validate").status_code == 404
    assert b.delete(f"/api/labs/sessions/{sid}").status_code == 204  # idempotent, deletes nothing
    assert a.get(f"/api/labs/sessions/{sid}").status_code == 200


def test_a_forged_guest_cookie_is_replaced_not_trusted():
    c = _guest()
    c.cookies.set(GUEST_COOKIE, "../../etc/passwd")
    r = c.post("/api/labs/cyber-nmap-001/start")
    assert r.status_code == 200
    issued = r.cookies[GUEST_COOKIE]
    assert issued != "../../etc/passwd" and _GUEST_TOKEN.match(issued)


def test_signing_in_separates_a_users_sessions_from_guest_ones():
    guest_sid = client.post("/api/labs/cyber-nmap-001/start").json()["id"]
    h = _user("u1")
    assert client.get(f"/api/labs/sessions/{guest_sid}", cookies=h).status_code == 404
    user_sid = client.post("/api/labs/cyber-nmap-001/start", cookies=h).json()["id"]
    assert user_sid != guest_sid
    assert client.get(f"/api/labs/sessions/{user_sid}").status_code == 404  # back to the guest id


def test_start_unknown_lab_is_404():
    assert client.post("/api/labs/nope/start", cookies=_user("u1")).status_code == 404


def test_full_pass_flow():
    h = _user("u1")
    r = client.post("/api/labs/cyber-nmap-001/start", cookies=h)
    assert r.status_code == 200
    sid = r.json()["id"]
    assert r.json()["status"] == "RUNNING"
    assert set(r.json()["progress"].values()) == {False}

    # Validating before recording anything leaves objectives unmet.
    r = client.post(f"/api/labs/sessions/{sid}/validate", cookies=h)
    assert r.json()["status"] == "RUNNING"
    assert not any(o["passed"] for o in r.json()["validation_results"])

    client.post(f"/api/labs/sessions/{sid}/findings", json=PORTS, cookies=h)
    r = client.post(f"/api/labs/sessions/{sid}/validate", cookies=h)
    body = r.json()
    assert body["status"] == "COMPLETED"
    assert all(body["progress"].values())
    assert body["completed_at"]


def test_reset_clears_progress_and_findings():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", cookies=h).json()["id"]
    client.post(f"/api/labs/sessions/{sid}/findings", json=PORTS, cookies=h)
    client.post(f"/api/labs/sessions/{sid}/validate", cookies=h)
    r = client.post(f"/api/labs/sessions/{sid}/reset", cookies=h)
    body = r.json()
    assert body["findings"] == {} and not any(body["progress"].values())
    assert body["status"] == "RUNNING"


# ---- authorization / isolation ----

def test_cannot_access_another_users_session():
    a = _user("alice")
    b = _user("bob")
    sid = client.post("/api/labs/cyber-nmap-001/start", cookies=a).json()["id"]
    # Bob sees the same 404 as for a non-existent session: existence is not leaked.
    assert client.get(f"/api/labs/sessions/{sid}", cookies=b).status_code == 404
    assert client.post(f"/api/labs/sessions/{sid}/validate", cookies=b).status_code == 404
    assert client.get(f"/api/labs/sessions/{sid}", cookies=a).status_code == 200


def test_delete_is_idempotent_and_owner_scoped():
    a = _user("alice")
    b = _user("bob")
    sid = client.post("/api/labs/cyber-nmap-001/start", cookies=a).json()["id"]
    # Bob's delete does nothing (still 204) and must not remove Alice's session.
    assert client.delete(f"/api/labs/sessions/{sid}", cookies=b).status_code == 204
    assert client.get(f"/api/labs/sessions/{sid}", cookies=a).status_code == 200
    assert client.delete(f"/api/labs/sessions/{sid}", cookies=a).status_code == 204
    assert client.delete(f"/api/labs/sessions/{sid}", cookies=a).status_code == 204  # again: no error
    assert client.get(f"/api/labs/sessions/{sid}", cookies=a).status_code == 404


def test_client_cannot_choose_image_or_target():
    h = _user("u1")
    # Extra body fields are ignored; the environment comes only from the server-side definition.
    r = client.post("/api/labs/cyber-nmap-001/start", cookies=h,
                    json={"image": "evil:latest", "provider": "docker", "target": "10.0.0.1"})
    assert r.status_code == 200
    text = r.text
    assert "evil:latest" not in text and "10.0.0.1" not in text and "environment_id" not in text


def test_findings_must_be_an_object():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", cookies=h).json()["id"]
    r = client.post(f"/api/labs/sessions/{sid}/findings", json={"findings": "not-a-dict"}, cookies=h)
    assert r.status_code == 400


# ---- expiry + cleanup ----

def test_session_expires_and_validate_is_blocked():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", cookies=h).json()["id"]
    sessions_mod.service._sessions[sid].expires_at = _now() - timedelta(minutes=1)
    assert client.get(f"/api/labs/sessions/{sid}", cookies=h).json()["status"] == "EXPIRED"
    assert client.post(f"/api/labs/sessions/{sid}/validate", cookies=h).status_code == 400


def test_cleanup_removes_expired_sessions():
    import asyncio

    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", cookies=h).json()["id"]
    sessions_mod.service._sessions[sid].expires_at = _now() - timedelta(minutes=1)
    removed = asyncio.run(sessions_mod.service.cleanup_expired())
    assert removed == 1
    assert sid not in sessions_mod.service._sessions
    # Cleanup again is safe.
    assert asyncio.run(sessions_mod.service.cleanup_expired()) == 0
