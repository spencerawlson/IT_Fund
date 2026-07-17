import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def setup_function():
    main.USERS.clear()
    main.TOKENS.clear()
    main.OTPS.clear()
    main.RESET_TOKENS.clear()


def test_health_returns_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_and_me_flow():
    r = client.post("/api/auth/register", json={"email": "u@example.com", "password": "secret123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "u@example.com"
    assert body["role"] == "user"

    r = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_duplicate_register_rejected():
    client.post("/api/auth/register", json={"email": "dup@example.com", "password": "secret123"})
    r = client.post("/api/auth/register", json={"email": "dup@example.com", "password": "secret123"})
    assert r.status_code == 400


def test_login_rejects_bad_credentials():
    r = client.post("/api/auth/login", json={"email": "x@example.com", "password": "bad"})
    assert r.status_code == 401


def test_forgot_password_creates_reset_token():
    client.post("/api/auth/register", json={"email": "fp@example.com", "password": "secret123"})
    r = client.post("/api/auth/forgot-password", json={"email": "fp@example.com"})
    assert r.status_code == 200
