"""Bounds on in-memory lab session storage, which matter now that starting a lab needs no account.

No pytest-asyncio in this project, so the async service is driven with asyncio.run (the HTTP tests
in test_labs.py go through TestClient, which runs its own loop).
"""
import asyncio
import sys
from datetime import timedelta
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient

import main
from labs import sessions as sessions_mod
from labs.sessions import COMPLETED, MAX_LIVE_SESSIONS_PER_OWNER, LabError, SessionService, _now

client = TestClient(main.app)
run = asyncio.run


def setup_function():
    client.cookies.clear()
    sessions_mod.service._sessions.clear()
    sessions_mod.service._providers["mock"]._envs.clear()


def test_one_visitor_cannot_hoard_live_sessions_over_http():
    for _ in range(MAX_LIVE_SESSIONS_PER_OWNER):
        assert client.post("/api/labs/cyber-nmap-001/start").status_code == 200
    r = client.post("/api/labs/cyber-nmap-001/start")
    assert r.status_code == 400 and "Exit one first" in r.json()["detail"]
    # Per visitor, not global: a different browser is unaffected.
    assert TestClient(main.app).post("/api/labs/cyber-nmap-001/start").status_code == 200


def test_exiting_a_lab_frees_a_slot():
    ids = [client.post("/api/labs/cyber-nmap-001/start").json()["id"] for _ in range(MAX_LIVE_SESSIONS_PER_OWNER)]
    assert client.post("/api/labs/cyber-nmap-001/start").status_code == 400
    assert client.delete(f"/api/labs/sessions/{ids[0]}").status_code == 204
    assert client.post("/api/labs/cyber-nmap-001/start").status_code == 200


def test_start_sweeps_sessions_whose_window_has_passed():
    svc = SessionService()
    stale = run(svc.start("cyber-nmap-001", "guest:abc"))
    stale.status = COMPLETED
    stale.expires_at = _now() - timedelta(minutes=1)
    fresh = run(svc.start("cyber-nmap-001", "guest:abc"))  # sweeps on the way in
    assert stale.id not in svc._sessions
    assert fresh.id in svc._sessions


def test_completed_results_survive_until_the_window_closes():
    svc = SessionService()
    done = run(svc.start("cyber-nmap-001", "guest:abc"))
    done.status = COMPLETED
    run(svc.cleanup_expired())
    assert svc.get(done.id, "guest:abc").status == COMPLETED


def test_expired_sessions_are_forgotten():
    svc = SessionService()
    old = run(svc.start("cyber-nmap-001", "guest:abc"))
    old.expires_at = _now() - timedelta(minutes=1)
    assert run(svc.cleanup_expired()) == 1
    assert old.id not in svc._sessions
    try:
        svc.get(old.id, "guest:abc")
    except LabError as err:
        assert err.code == "not_found"
    else:
        raise AssertionError("expected the swept session to be gone")
