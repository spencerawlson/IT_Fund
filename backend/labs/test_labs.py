import sys
from datetime import timedelta
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import main
from labs import sessions as sessions_mod
from labs.registry import LABS
from labs.sessions import _now

client = TestClient(main.app)


def setup_function():
    main.USERS.clear()
    main.TOKENS.clear()
    sessions_mod.service._sessions.clear()
    sessions_mod.service._providers["mock"]._envs.clear()


def _user(uid: str):
    main.USERS[uid] = {"id": uid, "email": f"{uid}@example.com", "role": "user"}
    return {"Authorization": f"Bearer {main._issue_token(uid)}"}


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
    # No image or provider is ever exposed to the client.
    blob = r.text
    assert "security-tools:latest" not in blob and "provider" not in blob


# ---- auth + lifecycle ----

def test_start_requires_auth():
    assert client.post("/api/labs/cyber-nmap-001/start").status_code == 401


def test_start_unknown_lab_is_404():
    assert client.post("/api/labs/nope/start", headers=_user("u1")).status_code == 404


def test_full_pass_flow():
    h = _user("u1")
    r = client.post("/api/labs/cyber-nmap-001/start", headers=h)
    assert r.status_code == 200
    sid = r.json()["id"]
    assert r.json()["status"] == "RUNNING"
    assert set(r.json()["progress"].values()) == {False}

    # Validating before recording anything leaves objectives unmet.
    r = client.post(f"/api/labs/sessions/{sid}/validate", headers=h)
    assert r.json()["status"] == "RUNNING"
    assert not any(o["passed"] for o in r.json()["validation_results"])

    client.post(f"/api/labs/sessions/{sid}/findings", json=PORTS, headers=h)
    r = client.post(f"/api/labs/sessions/{sid}/validate", headers=h)
    body = r.json()
    assert body["status"] == "COMPLETED"
    assert all(body["progress"].values())
    assert body["completed_at"]


def test_reset_clears_progress_and_findings():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=h).json()["id"]
    client.post(f"/api/labs/sessions/{sid}/findings", json=PORTS, headers=h)
    client.post(f"/api/labs/sessions/{sid}/validate", headers=h)
    r = client.post(f"/api/labs/sessions/{sid}/reset", headers=h)
    body = r.json()
    assert body["findings"] == {} and not any(body["progress"].values())
    assert body["status"] == "RUNNING"


# ---- authorization / isolation ----

def test_cannot_access_another_users_session():
    a = _user("alice")
    b = _user("bob")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=a).json()["id"]
    # Bob sees the same 404 as for a non-existent session: existence is not leaked.
    assert client.get(f"/api/labs/sessions/{sid}", headers=b).status_code == 404
    assert client.post(f"/api/labs/sessions/{sid}/validate", headers=b).status_code == 404
    assert client.get(f"/api/labs/sessions/{sid}", headers=a).status_code == 200


def test_delete_is_idempotent_and_owner_scoped():
    a = _user("alice")
    b = _user("bob")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=a).json()["id"]
    # Bob's delete does nothing (still 204) and must not remove Alice's session.
    assert client.delete(f"/api/labs/sessions/{sid}", headers=b).status_code == 204
    assert client.get(f"/api/labs/sessions/{sid}", headers=a).status_code == 200
    assert client.delete(f"/api/labs/sessions/{sid}", headers=a).status_code == 204
    assert client.delete(f"/api/labs/sessions/{sid}", headers=a).status_code == 204  # again: no error
    assert client.get(f"/api/labs/sessions/{sid}", headers=a).status_code == 404


def test_client_cannot_choose_image_or_target():
    h = _user("u1")
    # Extra body fields are ignored; the environment comes only from the server-side definition.
    r = client.post("/api/labs/cyber-nmap-001/start", headers=h,
                    json={"image": "evil:latest", "provider": "docker", "target": "10.0.0.1"})
    assert r.status_code == 200
    text = r.text
    assert "evil:latest" not in text and "10.0.0.1" not in text and "environment_id" not in text


def test_findings_must_be_an_object():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=h).json()["id"]
    r = client.post(f"/api/labs/sessions/{sid}/findings", json={"findings": "not-a-dict"}, headers=h)
    assert r.status_code == 400


# ---- expiry + cleanup ----

def test_session_expires_and_validate_is_blocked():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=h).json()["id"]
    sessions_mod.service._sessions[sid].expires_at = _now() - timedelta(minutes=1)
    assert client.get(f"/api/labs/sessions/{sid}", headers=h).json()["status"] == "EXPIRED"
    assert client.post(f"/api/labs/sessions/{sid}/validate", headers=h).status_code == 400


def test_cleanup_removes_expired_sessions():
    import asyncio

    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=h).json()["id"]
    sessions_mod.service._sessions[sid].expires_at = _now() - timedelta(minutes=1)
    removed = asyncio.run(sessions_mod.service.cleanup_expired())
    assert removed == 1
    assert sid not in sessions_mod.service._sessions
    # Cleanup again is safe.
    assert asyncio.run(sessions_mod.service.cleanup_expired()) == 0
