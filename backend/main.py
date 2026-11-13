from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

import logging

log = logging.getLogger(__name__)
#The AI Tutor
import ai_tutor

app = FastAPI(title="ITFund Auth API", version="0.1.0")

# Allowed browser origins come from APP_ORIGINS (comma-separated); defaults cover local dev.
# In production the frontend is same-origin via the /api rewrite, so this mainly covers dev and any
# explicitly trusted origins. Credentials require an explicit list, never "*".
import os

_origins = [o.strip() for o in os.environ.get("APP_ORIGINS", "http://localhost:5173,http://localhost:5188").split(",") if o.strip()]
# The Capacitor iOS/Android apps serve the bundled frontend from these fixed origins and call the
# API cross-origin, so they are always allowed regardless of APP_ORIGINS.
NATIVE_APP_ORIGINS = ["capacitor://localhost", "https://localhost"]
_origins += [o for o in NATIVE_APP_ORIGINS if o not in _origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authlib stores the OAuth state/nonce in a signed session cookie during the login round-trip.
from starlette.middleware.sessions import SessionMiddleware  # noqa: E402

# Boot-time config guards. A missing SESSION_SECRET is never silently
# papered over: the app refuses to boot unless the secret is explicitly set,
# or the operator explicitly opts into the insecure dev default with
# ALLOW_DEV_SECRET=1 (local development only — never in production). The old
# published dev literal is refused even when explicitly configured: it is in
# the public repo, so anyone who read it could forge the signed OAuth
# state/nonce cookie.
DEV_SESSION_SECRET = "dev-insecure-session-secret-change-me"

_session_secret = os.environ.get("SESSION_SECRET")
if _session_secret == DEV_SESSION_SECRET:
    raise RuntimeError(
        "SESSION_SECRET must not be the published dev default "
        "(dev-insecure-session-secret-change-me). Generate a real secret."
    )
if not _session_secret:
    if os.environ.get("ALLOW_DEV_SECRET") == "1":
        log.warning(
            "SESSION_SECRET is not set and ALLOW_DEV_SECRET=1 is present: "
            "booting with the insecure dev default. Never use this outside "
            "local development."
        )
        _session_secret = DEV_SESSION_SECRET
    else:
        raise RuntimeError(
            "SESSION_SECRET must be set. For local development only, set "
            "ALLOW_DEV_SECRET=1 to use the insecure dev default."
        )

# COOKIE_INSECURE=1 strips Secure from every cookie (session, admin, OAuth
# state). Refuse it in production, same fail-fast pattern as SESSION_SECRET.
if (
    os.environ.get("APP_ENV", "development").lower() == "production"
    and os.environ.get("COOKIE_INSECURE") == "1"
):
    raise RuntimeError("COOKIE_INSECURE=1 is refused when APP_ENV=production.")

# ALLOW_DEV_LOGIN=1 is a dev-only backdoor (see auth/router.py dev_login).
# Refuse it in production even though the docs already say never to set it.
if (
    os.environ.get("APP_ENV", "development").lower() == "production"
    and os.environ.get("ALLOW_DEV_LOGIN") == "1"
):
    raise RuntimeError("ALLOW_DEV_LOGIN=1 is refused when APP_ENV=production.")

app.add_middleware(
    SessionMiddleware,
    secret_key=_session_secret,
    same_site="lax",
    https_only=os.environ.get("COOKIE_INSECURE") != "1",
)

# Create database tables on startup (idempotent). In production the schema is owned by
# Alembic migrations (backend/alembic/versions), applied at startup below; create_all is
# only a dev/test convenience and never runs against the production database.
import db  # noqa: E402

IS_PRODUCTION = os.environ.get("APP_ENV", "development").lower() == "production"

if not IS_PRODUCTION:
    db.init_db()


# Stable key for the migration advisory lock below (any fixed 64-bit int).
_MIGRATION_LOCK_KEY = 7271700107


def _run_migrations() -> None:
    """Apply Alembic migrations to head, serialized so multiple uvicorn workers can't race.

    Every worker runs this in its startup lifespan. Without coordination, two workers call
    `alembic upgrade head` concurrently against Postgres, collide applying the same revision, and one
    crashes — which takes the whole service down (a real outage we hit). A session-level advisory
    lock lets exactly one worker apply the migration while the others wait; by the time they acquire
    the lock the schema is already at head, so their upgrade is a no-op. SQLite (dev/tests) has no
    advisory locks and no multi-worker races, so it upgrades directly.
    """
    from pathlib import Path

    from alembic import command
    from alembic.config import Config

    cfg = Config(str(Path(__file__).with_name("alembic.ini").resolve()))
    url = os.environ.get("DATABASE_URL") or db.DEFAULT_URL
    if not url.startswith("postgres"):
        command.upgrade(cfg, "head")
        return
    # uvicorn --workers N runs this lifespan in *every* worker. With a pending
    # migration, the workers race to apply it concurrently; on 2026-10-07 the
    # loser crashed startup ("Child process failed to start, stopping the
    # parent process"), taking the whole backend down behind a healthy tunnel
    # (Cloudflare 502). A session-level advisory lock serializes the workers:
    # the loser waits, then finds nothing left to apply. The lock releases on
    # disconnect, so a crashed worker can't wedge it.
    from sqlalchemy import create_engine, text

    engine = create_engine(url)
    try:
        with engine.connect() as conn:
            conn.execute(text(f"SELECT pg_advisory_lock({_MIGRATION_LOCK_KEY})"))
            try:
                command.upgrade(cfg, "head")
            finally:
                conn.execute(text(f"SELECT pg_advisory_unlock({_MIGRATION_LOCK_KEY})"))
    finally:
        engine.dispose()


from contextlib import asynccontextmanager  # noqa: E402


@asynccontextmanager
async def lifespan(app):
    if IS_PRODUCTION:
        _run_migrations()
    # Sweep orphaned lab containers: _sessions is in-memory, so a restart leaves
    # containers no worker tracks. Labeled + age-gated, so this is safe to run
    # in every worker (idempotent).
    try:
        from labs.sessions import service as _lab_service

        _docker = _lab_service._providers.get("docker")
        if _docker is not None:
            _reaped = await _docker.reap_orphans()
            if _reaped:
                log.warning("reaped %d orphaned lab containers on startup", _reaped)
    except Exception:
        log.exception("lab orphan reaper failed on startup")
    yield


app.router.lifespan_context = lifespan

# The AI tutor answers on both /ai/* and /api/ai/*, so it works whether or not the
# hosting layer strips the /api prefix before forwarding.
app.include_router(ai_tutor.router)
app.include_router(ai_tutor.router, prefix="/api")

# Interactive labs (Phase 1: simulation-only mock provider). Mounted on both prefixes like the
# tutor, so it works whether or not the hosting layer strips /api.
from labs.api import router as labs_router  # noqa: E402  (after app is created)

app.include_router(labs_router)
app.include_router(labs_router, prefix="/api")

# Cyber Missions (vertical slice: op-broken-shield over net-acl-001). Mounted
# on both prefixes like the labs router, so /api/missions/* works behind the
# /api rewrite.
from missions import router as missions_router  # noqa: E402

app.include_router(missions_router)
app.include_router(missions_router, prefix="/api")

# OAuth accounts (C3.2). Both prefixes, so /api/auth/* works behind the /api rewrite.
from auth.router import router as auth_router  # noqa: E402

app.include_router(auth_router)
app.include_router(auth_router, prefix="/api")

# Server-side progress (C3.3).
from progress_api import router as progress_router  # noqa: E402

app.include_router(progress_router)
app.include_router(progress_router, prefix="/api")

# Entitled content API (P0-1 remediation): premium lesson bodies, card answers,
# module notes and exam questions are served here only after an entitlement
# check — they no longer ship in the public JS bundle. Both prefixes like the
# other routers, so /api/content/* works behind the /api rewrite.
from content import router as content_router  # noqa: E402

app.include_router(content_router)
app.include_router(content_router, prefix="/api")

# Stripe subscription billing. Both prefixes like the other routers, so
# /api/billing/* works behind the /api rewrite.
from billing import router as billing_router  # noqa: E402

app.include_router(billing_router)
app.include_router(billing_router, prefix="/api")

# Admin panel (Spencer-only, password-gated). Both prefixes like the other
# routers, so /api/admin/* works behind the /api rewrite.
from admin import router as admin_router  # noqa: E402

app.include_router(admin_router)
app.include_router(admin_router, prefix="/api")

# Character voices (Cyber Missions Phase 2 — Cypher first) and Cypher
# analytics. Both prefixes like the other routers, so /api/voice/* and
# /api/analytics/* work behind the /api rewrite.
from voice import router as voice_router  # noqa: E402
from analytics import router as analytics_router  # noqa: E402

app.include_router(voice_router)
app.include_router(voice_router, prefix="/api")
app.include_router(analytics_router)
app.include_router(analytics_router, prefix="/api")

# ---- routes ----
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/db")
def health_db():
    try:
        db.ping()
        return {"db": "ok"}
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="database unavailable")
