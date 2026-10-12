"""Anonymous session lifecycle: a first-time visitor with no account and no cookies
can run a lab from start to completion (guest cookie issuance, session flow,
findings, validation, delete).

Entitlement is neutralized here (is_subscribed patched to True) — this exercises
the guest-cookie session mechanics, not billing. The 402 behavior for premium
labs is covered by test_lab_entitlement in test_labs.py.
"""
import sys
from pathlib import Path
from unittest import mock

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient

import main
from auth.deps import GUEST_COOKIE, GUEST_PREFIX, is_guest
from labs import api as labs_api
from labs import sessions as sessions_mod

FINDINGS = {"findings": {"hosts": {"target.lab": {"up": True}},
                         "ports": [{"target": "target.lab", "port": 22, "service": "ssh", "version": "OpenSSH 9.6"},
                                   {"target": "target.lab", "port": 80, "service": "http", "version": "nginx 1.25"}]}}


def test_a_brand_new_visitor_can_complete_a_lab():
    sessions_mod.service._sessions.clear()
    patcher = mock.patch.object(labs_api, "is_subscribed", return_value=True)
    patcher.start()
    try:
        visitor = TestClient(main.app)  # no session cookie, no bearer token, no account

        assert visitor.get("/api/labs/definitions").status_code == 200

        started = visitor.post("/api/labs/cyber-nmap-001/start")
        assert started.status_code == 200, started.text
        session_id = started.json()["id"]
        assert started.json()["status"] == "RUNNING"

        guest = visitor.cookies[GUEST_COOKIE]
        assert guest and GUEST_COOKIE in started.cookies

        assert visitor.get(f"/api/labs/sessions/{session_id}").status_code == 200
        visitor.post(f"/api/labs/sessions/{session_id}/findings", json=FINDINGS)
        validated = visitor.post(f"/api/labs/sessions/{session_id}/validate")
        assert validated.status_code == 200
        assert validated.json()["status"] == "COMPLETED", validated.json()

        # The guest id is stable across the whole lab, and is never mistaken for an account.
        assert visitor.cookies[GUEST_COOKIE] == guest
        assert is_guest(GUEST_PREFIX + guest)
        assert visitor.delete(f"/api/labs/sessions/{session_id}").status_code == 204
    finally:
        patcher.stop()
