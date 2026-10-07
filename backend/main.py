from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
#The AI Tutor
import ai_tutor

app = FastAPI(title="ITFund Auth API", version="0.1.0")

# Allowed browser origins come from APP_ORIGINS (comma-separated); defaults cover local dev.
# In production the frontend is same-origin via the /api rewrite, so this mainly covers dev and any
# explicitly trusted origins. Credentials require an explicit list, never "*".
import os

_origins = [o.strip() for o in os.environ.get("APP_ORIGINS", "http://localhost:5173,http://localhost:5188").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authlib stores the OAuth state/nonce in a signed session cookie during the login round-trip.
from starlette.middleware.sessions import SessionMiddleware  # noqa: E402

# A missing SESSION_SECRET is only tolerable in local dev: in production it would let
# anyone forge the signed OAuth state cookie (login CSRF). Refuse to boot instead.
_session_secret = os.environ.get("SESSION_SECRET")
if not _session_secret:
    if os.environ.get("APP_ENV", "development").lower() == "production":
        raise RuntimeError("SESSION_SECRET must be set when APP_ENV=production.")
    import warnings

    warnings.warn(
        "SESSION_SECRET is not set; using an insecure dev default. "
        "Set SESSION_SECRET before any real deployment.",
        RuntimeWarning,
        stacklevel=2,
    )
    _session_secret = "dev-insecure-session-secret-change-me"

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

# OAuth accounts (C3.2). Both prefixes, so /api/auth/* works behind the /api rewrite.
from auth.router import router as auth_router  # noqa: E402

app.include_router(auth_router)
app.include_router(auth_router, prefix="/api")

# Server-side progress (C3.3).
from progress_api import router as progress_router  # noqa: E402

app.include_router(progress_router)
app.include_router(progress_router, prefix="/api")

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
