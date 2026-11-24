"""App-level smoke tests. The old demo auth (plaintext in-memory users/tokens) was removed;
these tests pin that it stays gone and that the health endpoints answer."""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


# ---- boot-time config guards (subprocess: a fresh interpreter, env scrubbed) ----

_BOOT_ENV_KEYS = ("SESSION_SECRET", "ALLOW_DEV_SECRET", "ALLOW_DEV_LOGIN", "APP_ENV", "COOKIE_INSECURE")


def _boot(**overrides):
    """Import main in a fresh interpreter with only the given boot env vars.

    The pytest process itself carries a test-only SESSION_SECRET (conftest),
    so the child env is built from scratch for the boot-relevant keys.
    cwd is a temp dir so importing main cannot create labs_dev.db in the repo.
    """
    env = {k: v for k, v in os.environ.items() if k not in _BOOT_ENV_KEYS}
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["PYTHONPATH"] = str(backend_dir)
    env.update(overrides)
    if env.get("APP_ENV") == "production":
        # db.py configures itself at import and already refuses production
        # without DATABASE_URL; give the child a throwaway SQLite URL so the
        # boot guards under test are the ones that fire (or don't).
        env.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
    with tempfile.TemporaryDirectory() as td:
        return subprocess.run(
            [sys.executable, "-c", "import main; print('booted')"],
            cwd=td,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )


def test_missing_session_secret_refuses_boot():
    p = _boot()
    assert p.returncode != 0
    assert "SESSION_SECRET" in p.stderr


def test_dev_secret_flag_allows_boot():
    p = _boot(ALLOW_DEV_SECRET="1")
    assert p.returncode == 0, p.stderr
    assert "booted" in p.stdout


def test_published_dev_secret_is_refused():
    p = _boot(SESSION_SECRET="dev-insecure-session-secret-change-me")
    assert p.returncode != 0
    assert "dev default" in p.stderr


def test_cookie_insecure_refused_in_production():
    p = _boot(SESSION_SECRET="test-secret-x", APP_ENV="production", COOKIE_INSECURE="1")
    assert p.returncode != 0
    assert "COOKIE_INSECURE" in p.stderr


def test_dev_login_refused_in_production():
    p = _boot(SESSION_SECRET="test-secret-x", APP_ENV="production", ALLOW_DEV_LOGIN="1")
    assert p.returncode != 0
    assert "ALLOW_DEV_LOGIN" in p.stderr


def test_production_boots_with_secret_set():
    p = _boot(SESSION_SECRET="test-secret-x", APP_ENV="production")
    assert p.returncode == 0, p.stderr
    assert "booted" in p.stdout


# ---- session cookie SameSite (Sign in with Apple needs None when Secure) ----

def _session_cookie_attrs(**overrides):
    """Boot main in a fresh interpreter and report the SessionMiddleware cookie attrs.

    Same _boot pattern, but the child prints the middleware kwargs as JSON
    instead of just 'booted'.
    """
    env = {k: v for k, v in os.environ.items() if k not in _BOOT_ENV_KEYS}
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["PYTHONPATH"] = str(backend_dir)
    env.update(overrides)
    code = (
        "import json, main; "
        "mw = [m for m in main.app.user_middleware if m.cls.__name__ == 'SessionMiddleware']; "
        "print(json.dumps({'same_site': mw[0].kwargs['same_site'], "
        "'https_only': mw[0].kwargs['https_only']}))"
    )
    with tempfile.TemporaryDirectory() as td:
        return subprocess.run(
            [sys.executable, "-c", code],
            cwd=td,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )


def _attrs_from_boot(p):
    assert p.returncode == 0, p.stderr
    line = [ln for ln in p.stdout.splitlines() if ln.strip()][-1]
    return json.loads(line)


def test_session_cookie_samesite_none_when_secure():
    # Apple's authorize response is a cross-site form POST: a Lax session
    # cookie is withheld on it, so the callback loses the OAuth state and
    # Sign in with Apple fails. Production (Secure cookie) must be None.
    assert _attrs_from_boot(_session_cookie_attrs(SESSION_SECRET="test-secret-x")) == {
        "same_site": "none",
        "https_only": True,
    }


def test_session_cookie_samesite_lax_without_secure():
    # SameSite=None without Secure is rejected by browsers, so local http
    # dev (COOKIE_INSECURE=1) keeps Lax — no regression there.
    assert _attrs_from_boot(
        _session_cookie_attrs(SESSION_SECRET="test-secret-x", COOKIE_INSECURE="1")
    ) == {"same_site": "lax", "https_only": False}


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
