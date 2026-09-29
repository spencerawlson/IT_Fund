import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from sqlalchemy.exc import IntegrityError

import db
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def setup_function():
    # Fresh in-memory database per test.
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()


def test_health_db_ok():
    r = client.get("/health/db")
    assert r.status_code == 200 and r.json() == {"db": "ok"}


def test_dev_users_endpoint_removed():
    # The endpoint that leaked registered emails must be gone.
    assert client.get("/api/dev/users").status_code == 404


def test_can_persist_user_identity_and_progress():
    from db_models import AuthSession, Identity, Progress, User

    with db.SessionLocal() as s:
        user = User(display_name="Ada", email="ada@example.com")
        s.add(user)
        s.flush()
        s.add(Identity(user_id=user.id, provider="github", provider_subject="gh-1", email="ada@example.com", email_verified=True))
        s.add(Progress(user_id=user.id, state={"xp": 5}, version=1))
        s.add(AuthSession(id_hash="abc", user_id=user.id, expires_at=datetime.now(timezone.utc) + timedelta(days=30)))
        s.commit()
        uid = user.id

    with db.SessionLocal() as s:
        user = s.get(User, uid)
        assert user.email == "ada@example.com"
        assert len(user.identities) == 1 and user.identities[0].provider == "github"
        assert s.get(Progress, uid).state == {"xp": 5}


def test_identity_unique_per_provider_subject():
    from db_models import Identity, User

    with db.SessionLocal() as s:
        u1 = User(display_name="A")
        u2 = User(display_name="B")
        s.add_all([u1, u2])
        s.flush()
        s.add(Identity(user_id=u1.id, provider="google", provider_subject="sub-1"))
        s.commit()
        s.add(Identity(user_id=u2.id, provider="google", provider_subject="sub-1"))  # same provider+subject
        with pytest.raises(IntegrityError):
            s.commit()
