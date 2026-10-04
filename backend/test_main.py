"""App-level smoke tests. The old demo auth (plaintext in-memory users/tokens) was removed;
these tests pin that it stays gone and that the health endpoints answer."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_health_returns_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_demo_auth_is_gone():
    # The demo register/login/OTP/password-reset endpoints must not exist anymore.
    for path, payload in [
        ("/auth/register", {"email": "u@example.com", "password": "secret123"}),
        ("/auth/login", {"email": "u@example.com", "password": "secret123"}),
        ("/auth/verify-otp", {"email": "u@example.com", "otpCode": "000000"}),
        ("/auth/resend-otp", {"email": "u@example.com"}),
        ("/auth/forgot-password", {"email": "u@example.com"}),
        ("/auth/reset-password", {"resetToken": "x", "newPassword": "y"}),
        ("/api/auth/register", {"email": "u@example.com", "password": "secret123"}),
    ]:
        r = client.post(path, json=payload)
        assert r.status_code in (404, 405), (path, r.status_code)
    r = client.get("/auth/me")
    assert r.status_code == 401  # the real OAuth router's /me, correctly refusing a sessionless call
    # A forged demo-style bearer token must no longer be honored as identity anywhere.
    r = client.get("/auth/me", headers={"Authorization": "Bearer deadbeef"})
    assert r.status_code == 401


def test_demo_auth_leaves_no_module_state():
    for attr in ("USERS", "TOKENS", "OTPS", "RESET_TOKENS"):
        assert not hasattr(main, attr), attr
