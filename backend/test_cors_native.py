"""The Capacitor apps call the API cross-origin from fixed origins; CORS must allow them."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def _preflight(origin):
    return client.options(
        "/api/auth/me",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )


@pytest.mark.parametrize("origin", ["capacitor://localhost", "https://localhost"])
def test_native_app_origins_pass_preflight(origin):
    res = _preflight(origin)
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == origin
    assert res.headers["access-control-allow-credentials"] == "true"


def test_unknown_origin_still_rejected():
    res = _preflight("https://evil.example")
    assert res.status_code == 400
    assert "access-control-allow-origin" not in res.headers
