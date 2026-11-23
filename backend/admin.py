"""Admin panel API: accounts, subscriptions, AI tutor costs.

Kay Ayiti model: admin is Spencer-only, password-gated, browser-only via a
direct URL (/admin), never in the normal navigation. The gate is a server-side
env-var password (ADMIN_PASSWORD) — no admin accounts, no sign-up, no reset.

Auth: POST /admin/login with {"password": "..."} sets a short-lived HttpOnly
session cookie (rtc_admin, 24h, sliding). Every /admin/* endpoint except
login/status requires it. Wrong password — or an unset ADMIN_PASSWORD — returns
a generic 401 with no hint about which is the case.

Env vars (never hardcoded, never in the repo):
  ADMIN_PASSWORD — the admin password. If unset, login always fails.
"""
from __future__ import annotations

import csv
import hashlib
import hmac
import io
import logging
import os
import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_

import audit
import db
import enrollment
from db_models import AiTutorCall, AuthSession, LabCompletion, ManualGrant, Progress, Subscription, User

log = logging.getLogger("admin")

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_COOKIE = "rtc_admin"
ADMIN_SESSION_HOURS = 24
#: Lessons count as passed at the same bar as the learner UI (src/lib/progress/engine.js).
PASS_PCT = 70

#: Admin-login brute-force limit: failed attempts per client IP in a window,
#: then 429 with Retry-After. Module-level so tests can patch the window.
#: In-memory, per process — prod runs `--workers 2`, so each worker has its
#: own buckets and the effective limit is ~2x; a shared/DB-backed store is
#: the follow-up (see P2-3). Successful login clears the caller's bucket.
ADMIN_LOGIN_MAX_ATTEMPTS = 5
ADMIN_LOGIN_WINDOW_SECONDS = 15 * 60

_admin_login_attempts: dict[str, deque] = defaultdict(deque)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    # SQLite returns naive datetimes; treat stored values as UTC.
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _admin_password() -> str | None:
    return os.environ.get("ADMIN_PASSWORD") or None


def _password_ok(provided: str | None) -> bool:
    expected = _admin_password()
    if not expected or not provided:
        return False
    return hmac.compare_digest(provided, expected)


def _create_admin_session() -> str:
    from db_models import AdminSession

    raw = secrets.token_urlsafe(32)
    with db.SessionLocal() as s:
        s.add(
            AdminSession(
                id_hash=_hash(raw),
                expires_at=_now() + timedelta(hours=ADMIN_SESSION_HOURS),
            )
        )
        s.commit()
    return raw


def _admin_session_valid(raw: str | None) -> bool:
    """True when the cookie holds a live admin session; slides the expiry."""
    if not raw:
        return False
    from db_models import AdminSession

    try:
        with db.SessionLocal() as s:
            row = s.get(AdminSession, _hash(raw))
            if row is None:
                return False
            if _aware(row.expires_at) <= _now():
                s.delete(row)
                s.commit()
                return False
            row.last_seen_at = _now()
            row.expires_at = _now() + timedelta(hours=ADMIN_SESSION_HOURS)
            s.commit()
            return True
    except Exception:
        log.exception("admin session check failed")
        return False


def _delete_admin_session(raw: str | None) -> None:
    if not raw:
        return
    from db_models import AdminSession

    try:
        with db.SessionLocal() as s:
            row = s.get(AdminSession, _hash(raw))
            if row is not None:
                s.delete(row)
                s.commit()
    except Exception:
        log.exception("admin session delete failed")


def _admin_cookie_kwargs() -> dict:
    """Set-cookie options. Secure is on unless COOKIE_INSECURE=1 (local http dev)."""
    return {
        "httponly": True,
        "secure": os.environ.get("COOKIE_INSECURE") != "1",
        "samesite": "lax",
        "max_age": ADMIN_SESSION_HOURS * 3600,
        "path": "/",
    }


def require_admin(request: Request) -> None:
    """Dependency: 401 unless the request carries a live admin session cookie."""
    if not _admin_session_valid(request.cookies.get(ADMIN_COOKIE)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


# ---------- auth ----------


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _admin_login_retry_after(ip: str, now: float | None = None) -> int | None:
    """Seconds until `ip` may try again, or None when under the limit."""
    now = time.time() if now is None else now
    q = _admin_login_attempts.get(ip)
    if not q:
        return None
    while q and q[0] <= now - ADMIN_LOGIN_WINDOW_SECONDS:
        q.popleft()
    if len(q) < ADMIN_LOGIN_MAX_ATTEMPTS:
        return None
    return int(q[0] + ADMIN_LOGIN_WINDOW_SECONDS - now) + 1


def _record_admin_login_failure(ip: str) -> None:
    # Log IP + timestamp only — never the attempted password.
    log.warning("admin login failed from %s at %s", ip, _now().isoformat())
    _admin_login_attempts[ip].append(time.time())


@router.post("/login")
def admin_login(body: dict, response: Response, request: Request) -> dict:
    """Password gate. Generic failure either way: never reveal whether the
    password is unset or merely wrong. Failed attempts are rate-limited per
    IP (see ADMIN_LOGIN_MAX_ATTEMPTS): past the limit every attempt — right
    password included — gets 429 until the window passes."""
    ip = _client_ip(request)
    retry_after = _admin_login_retry_after(ip)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )
    if not _password_ok(body.get("password") if isinstance(body, dict) else None):
        _record_admin_login_failure(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password"
        )
    _admin_login_attempts.pop(ip, None)
    raw = _create_admin_session()
    response.set_cookie(ADMIN_COOKIE, raw, **_admin_cookie_kwargs())
    return {"ok": True}


@router.post("/logout")
def admin_logout(request: Request, response: Response) -> dict:
    _delete_admin_session(request.cookies.get(ADMIN_COOKIE))
    response.delete_cookie(ADMIN_COOKIE, path="/")
    return {"ok": True}


@router.get("/status")
def admin_status(request: Request) -> dict:
    return {"authenticated": _admin_session_valid(request.cookies.get(ADMIN_COOKIE))}


# ---------- helpers ----------


def _lessons_passed(state: dict | None) -> int:
    """Lessons passed, same rule as the learner UI: best score >= 70%."""
    if not isinstance(state, dict):
        return 0
    lessons = state.get("lessons") or {}
    if not isinstance(lessons, dict):
        return 0
    return sum(1 for v in lessons.values() if isinstance(v, dict) and (v.get("best") or 0) >= PASS_PCT)


def _iso(dt: datetime | None) -> str | None:
    aware = _aware(dt)
    return aware.isoformat() if aware else None


#: Manual-grant note length (admin-entered, stored verbatim, shown on the board).
MAX_NOTE_CHARS = 500

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def _valid_email(email: str) -> bool:
    return isinstance(email, str) and len(email) <= 320 and bool(_EMAIL_RE.match(email))


def _clean_note(raw) -> str:
    return (raw or "").strip() if isinstance(raw, str) else ""


def _grant_dict(grant: ManualGrant | None) -> dict | None:
    """The manual-grant state for one account, or None when never granted."""
    if grant is None:
        return None
    return {
        "active": grant.revoked_at is None,
        "granted_at": _iso(grant.granted_at),
        "note": grant.note or "",
        "revoked_at": _iso(grant.revoked_at),
        "revoked_note": grant.revoked_note or "",
    }


def _account_maps(s, ids: list[str]) -> dict:
    """Prefetched per-user maps for account rows: subscriptions, progress,
    last session seen, lab counts, manual grants."""
    if not ids:
        return {"subs": {}, "progress": {}, "last_seen": {}, "labs": {}, "grants": {}}
    return {
        "subs": {r.user_id: r for r in s.query(Subscription).filter(Subscription.user_id.in_(ids)).all()},
        "progress": {r.user_id: r for r in s.query(Progress).filter(Progress.user_id.in_(ids)).all()},
        "last_seen": {
            r.user_id: r.last
            for r in s.query(AuthSession.user_id, func.max(AuthSession.last_seen_at).label("last"))
            .filter(AuthSession.user_id.in_(ids))
            .group_by(AuthSession.user_id)
            .all()
        },
        "labs": {
            r.user_id: r.n
            for r in s.query(LabCompletion.user_id, func.count().label("n"))
            .filter(LabCompletion.user_id.in_(ids))
            .group_by(LabCompletion.user_id)
            .all()
        },
        "grants": {g.user_id: g for g in s.query(ManualGrant).filter(ManualGrant.user_id.in_(ids)).all()},
    }


def _account_item(u: User, sub: Subscription | None, prog: Progress | None,
                  seen: datetime | None, lab_count: int, grant: ManualGrant | None) -> dict:
    """One row of the accounts list, with Stripe state and manual-grant state."""
    seen_aware = _aware(seen)
    updated = _aware(prog.updated_at) if prog else None
    last_active = max([d for d in (seen_aware, updated) if d], default=None)
    return {
        "id": u.id,
        "display_name": u.display_name or "",
        "email": u.email,
        "created_at": _iso(u.created_at),
        "last_active": _iso(last_active),
        "lessons_passed": _lessons_passed(prog.state if prog else None),
        "labs_completed": lab_count,
        "subscription_status": sub.status if sub else "none",
        "subscription_period_end": _iso(sub.current_period_end) if sub else None,
        "manual_grant": _grant_dict(grant),
    }


def _mrr() -> dict | None:
    """Monthly recurring revenue at the live Stripe price, or None when Stripe
    is not configured (shown as "unknown", never a made-up figure)."""
    import billing

    price = billing.plan_price()
    if not price.get("configured"):
        return None
    unit = price.get("unit_amount")
    if unit is None:
        return None
    try:
        with db.SessionLocal() as s:
            paying = (
                s.query(func.count())
                .select_from(Subscription)
                .filter(Subscription.status.in_(billing.ACTIVE_STATUSES))
                .scalar()
                or 0
            )
    except Exception:
        log.exception("admin MRR count failed")
        return None
    return {
        "amount": round(paying * unit / 100, 2),
        "currency": price.get("currency", "usd"),
        "paying_count": paying,
        "price_display": price.get("display", ""),
        "source": "Stripe live price",
    }


# ---------- views ----------


@router.get("/overview", dependencies=[Depends(require_admin)])
def admin_overview() -> dict:
    """Dashboard counts for the admin landing tab."""
    with db.SessionLocal() as s:
        # Deleted accounts (deleted_at set) do not count — same filter as
        # /public/seats and the seat-cap check in auth.identity, so the
        # board, the landing counter, and the cap can never disagree.
        total_users = s.query(func.count()).select_from(User).filter(User.deleted_at.is_(None)).scalar() or 0
        subs = {row.status: row.n for row in s.query(Subscription.status, func.count().label("n")).group_by(Subscription.status).all()}
        paying = subs.get("active", 0) + subs.get("trialing", 0)
        since = _now() - timedelta(days=30)
        calls_30d = (
            s.query(func.count()).select_from(AiTutorCall).filter(AiTutorCall.created_at >= since).scalar() or 0
        )
        cost_30d = (
            s.query(func.coalesce(func.sum(AiTutorCall.cost_usd), 0))
            .filter(AiTutorCall.created_at >= since)
            .scalar()
            or 0
        )
        manual_grants_active = (
            s.query(func.count())
            .select_from(ManualGrant)
            .filter(ManualGrant.revoked_at.is_(None))
            .scalar()
            or 0
        )
        # Spencer's placeholder accounts (Reserved badge) hold places but are
        # not in-person members: counted apart, never as enrollments.
        reserved_seats = (
            s.query(func.count())
            .select_from(ManualGrant)
            .join(User, User.id == ManualGrant.user_id)
            .filter(
                ManualGrant.revoked_at.is_(None),
                User.deleted_at.is_(None),
                func.lower(User.email).like(f"%{enrollment.RESERVED_EMAIL_SUFFIX}"),
            )
            .scalar()
            or 0
        )
    return {
        "total_users": total_users,
        "paying_subscribers": paying,
        "subscriptions_by_status": subs,
        "manual_grants_active": manual_grants_active,
        "manual_members": max(0, manual_grants_active - reserved_seats),
        "reserved_seats": reserved_seats,
        "mrr": _mrr(),
        "ai_calls_30d": calls_30d,
        "ai_cost_30d_usd": round(float(cost_30d), 6),
    }


@router.get("/accounts", dependencies=[Depends(require_admin)])
def admin_accounts(q: str = "", page: int = 1, page_size: int = 25) -> dict:
    """All accounts, paginated, searchable by name/email. Progress comes from
    the stored server progress state; last active is the latest of the last
    session seen and the last progress save (unknown when neither exists)."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    needle = (q or "").strip()
    with db.SessionLocal() as s:
        query = s.query(User).filter(User.deleted_at.is_(None))
        if needle:
            # Escape LIKE wildcards in the needle so q=% matches only accounts
            # literally containing %, not every account (bound parameter, so
            # this is wildcard abuse, not SQL injection — but escape anyway).
            escaped = (
                needle.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            )
            like = f"%{escaped}%"
            query = query.filter(
                or_(
                    User.display_name.ilike(like, escape="\\"),
                    User.email.ilike(like, escape="\\"),
                )
            )
        total = query.count()
        users = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        ids = [u.id for u in users]
        maps = _account_maps(s, ids)
    items = [
        _account_item(
            u,
            maps["subs"].get(u.id),
            maps["progress"].get(u.id),
            maps["last_seen"].get(u.id),
            maps["labs"].get(u.id, 0),
            maps["grants"].get(u.id),
        )
        for u in users
    ]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/subscriptions", dependencies=[Depends(require_admin)])
def admin_subscriptions() -> dict:
    """Every stored subscription record (written only by the Stripe webhook)
    plus totals. Amounts come from the live Stripe price, never from a
    per-subscription amount — the subscriptions table stores no amount."""
    with db.SessionLocal() as s:
        rows = (
            s.query(Subscription, User)
            .join(User, User.id == Subscription.user_id)
            .filter(User.deleted_at.is_(None))
            .order_by(Subscription.updated_at.desc())
            .all()
        )
        by_status: dict[str, int] = {}
        for sub, _ in rows:
            by_status[sub.status] = by_status.get(sub.status, 0) + 1
    items = [
        {
            "user_id": sub.user_id,
            "display_name": user.display_name or "",
            "email": user.email,
            "status": sub.status,
            "stripe_customer_id": sub.stripe_customer_id,
            "stripe_subscription_id": sub.stripe_subscription_id,
            "current_period_end": _iso(sub.current_period_end),
            "updated_at": _iso(sub.updated_at),
        }
        for sub, user in rows
    ]
    return {"totals_by_status": by_status, "mrr": _mrr(), "items": items}


@router.get("/ai-calls", dependencies=[Depends(require_admin)])
def admin_ai_calls(days: int = 30, page: int = 1, page_size: int = 25) -> dict:
    """AI tutor call totals, per-day series, per-user totals, recent calls.
    Cost history starts when call logging ships — there is no history before it."""
    days = min(max(days, 1), 365)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    since = _now() - timedelta(days=days)
    with db.SessionLocal() as s:
        totals = s.query(
            func.count().label("calls"),
            func.coalesce(func.sum(AiTutorCall.prompt_tokens), 0).label("prompt_tokens"),
            func.coalesce(func.sum(AiTutorCall.completion_tokens), 0).label("completion_tokens"),
            func.coalesce(func.sum(AiTutorCall.cost_usd), 0).label("cost"),
        ).filter(AiTutorCall.created_at >= since).one()
        per_day = (
            s.query(
                func.date(AiTutorCall.created_at).label("day"),
                func.count().label("calls"),
                func.coalesce(func.sum(AiTutorCall.cost_usd), 0).label("cost"),
            )
            .filter(AiTutorCall.created_at >= since)
            .group_by(func.date(AiTutorCall.created_at))
            .order_by(func.date(AiTutorCall.created_at).desc())
            .all()
        )
        per_user = (
            s.query(
                AiTutorCall.user_id,
                func.count().label("calls"),
                func.coalesce(func.sum(AiTutorCall.cost_usd), 0).label("cost"),
            )
            .filter(AiTutorCall.created_at >= since)
            .group_by(AiTutorCall.user_id)
            .order_by(func.count().desc())
            .limit(10)
            .all()
        )
        total_rows = (
            s.query(func.count()).select_from(AiTutorCall).filter(AiTutorCall.created_at >= since).scalar() or 0
        )
        recent = (
            s.query(AiTutorCall)
            .filter(AiTutorCall.created_at >= since)
            .order_by(AiTutorCall.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        user_ids = {c.user_id for c in recent} | {r.user_id for r in per_user}
        names = {
            u.id: (u.display_name or "", u.email)
            for u in s.query(User).filter(User.id.in_(user_ids)).all()
        } if user_ids else {}
    return {
        "days": days,
        "totals": {
            "calls": totals.calls,
            "prompt_tokens": int(totals.prompt_tokens),
            "completion_tokens": int(totals.completion_tokens),
            "cost_usd": round(float(totals.cost), 6),
        },
        "per_day": [
            {"day": str(d.day), "calls": d.calls, "cost_usd": round(float(d.cost), 6)}
            for d in per_day
        ],
        "per_user": [
            {
                "user_id": r.user_id,
                "display_name": names.get(r.user_id, ("", None))[0],
                "email": names.get(r.user_id, ("", None))[1],
                "calls": r.calls,
                "cost_usd": round(float(r.cost), 6),
            }
            for r in per_user
        ],
        "total": total_rows,
        "page": page,
        "page_size": page_size,
        "recent": [
            {
                "id": c.id,
                "user_id": c.user_id,
                "display_name": names.get(c.user_id, ("", None))[0],
                "email": names.get(c.user_id, ("", None))[1],
                "mode": c.mode,
                "model": c.model,
                "prompt_tokens": c.prompt_tokens,
                "completion_tokens": c.completion_tokens,
                "cost_usd": round(float(c.cost_usd), 6) if c.cost_usd is not None else None,
                "cached": c.cached,
                "error": c.error,
                "created_at": _iso(c.created_at),
            }
            for c in recent
        ],
    }

# ---------- manual enrollment (in-person sign-ups) ----------


def _require_account(s, user_id: str) -> User:
    """The non-deleted account for `user_id`, or 404."""
    user = s.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    return user


#: Shown when a paid manual enrollment would exceed the founding capacity.
CAPACITY_FULL_DETAIL = (
    "All founding membership places are taken. Raise the capacity in Enrollment, "
    "or wait for a place to be released."
)


def _require_room(user_id: str | None = None) -> None:
    """409 unless a paid place is free (or this account already holds one)."""
    if user_id is not None and enrollment.holds_place(user_id):
        return
    if not enrollment.has_room(enrollment.PAID):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=CAPACITY_FULL_DETAIL)


@router.post("/accounts", dependencies=[Depends(require_admin)], status_code=status.HTTP_201_CREATED)
def admin_add_account(body: dict, request: Request) -> dict:
    """Add a customer who enrolled in person: create the account by email and
    grant paid access in the same call. The customer signs in later with
    Google/GitHub — the first provider-verified sign-in with this email
    merges into this account (see auth/identity.py), so no password is ever
    set here. The grant is recorded in manual_grants, never in the Stripe
    subscriptions table."""
    if not isinstance(body, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request body.")
    display_name = body.get("display_name") if isinstance(body.get("display_name"), str) else ""
    display_name = (display_name or "").strip()
    email = body.get("email") if isinstance(body.get("email"), str) else ""
    email = (email or "").strip().lower()
    note = _clean_note(body.get("note"))
    if not display_name or len(display_name) > 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Display name is required (max 120 characters).",
        )
    if not _valid_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="A valid email address is required."
        )
    if len(note) > MAX_NOTE_CHARS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Note must be at most 500 characters."
        )
    with db.SessionLocal() as s:
        existing = (
            s.query(User)
            .filter(func.lower(User.email) == email, User.deleted_at.is_(None))
            .first()
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
        _require_room()
        user = User(display_name=display_name, email=email)
        s.add(user)
        s.flush()
        grant = ManualGrant(user_id=user.id, note=note)
        s.add(grant)
        s.commit()
        item = _account_item(user, None, None, None, 0, grant)
        result = {"user": item, "manual_grant": _grant_dict(grant)}
    enrollment.sync_user(user.id)  # takes the place checked above
    audit.record("account.add_with_grant", target_user_id=user.id,
                 details={"email": email}, request=request)
    log.info("admin added customer %s (%s) with a manual grant", user.id, email)
    return result


@router.patch("/accounts/{user_id}", dependencies=[Depends(require_admin)])
def admin_update_account(user_id: str, body: dict, request: Request) -> dict:
    """Change an account's name and/or email. This is how a reserved seat
    becomes a real person: a dummy (1@road2cissp.local) takes the person's
    name and email. The manual grant follows the account id, so paid access
    survives the change — no grant is created, revoked, or re-dated. The new
    email must be unique across non-deleted accounts (409 otherwise); the
    first provider-verified sign-in with the new email merges into this
    account, exactly as for an added customer."""
    if not isinstance(body, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request body.")
    has_name = "display_name" in body
    has_email = "email" in body
    if not has_name and not has_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update."
        )
    display_name = None
    if has_name:
        raw_name = body.get("display_name")
        if not isinstance(raw_name, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Display name must be a string."
            )
        display_name = raw_name.strip()
        if not display_name or len(display_name) > 120:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Display name is required (max 120 characters).",
            )
    email = None
    if has_email:
        raw_email = body.get("email")
        if not isinstance(raw_email, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email must be a string."
            )
        email = raw_email.strip().lower()
        if not _valid_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="A valid email address is required."
            )
    with db.SessionLocal() as s:
        user = _require_account(s, user_id)
        if email is not None:
            collision = (
                s.query(User)
                .filter(
                    func.lower(User.email) == email,
                    User.deleted_at.is_(None),
                    User.id != user.id,
                )
                .first()
            )
            if collision is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists.",
                )
        if display_name is not None:
            user.display_name = display_name
        if email is not None:
            user.email = email
        s.commit()
        maps = _account_maps(s, [user.id])
        item = _account_item(
            user,
            maps["subs"].get(user.id),
            maps["progress"].get(user.id),
            maps["last_seen"].get(user.id),
            maps["labs"].get(user.id, 0),
            maps["grants"].get(user.id),
        )
    changed = {k: v for k, v in (("display_name", display_name), ("email", email)) if v is not None}
    # A placeholder given a real email becomes a paid in-person member (and
    # back): re-derive the place's source.
    enrollment.sync_user_safely(user_id)
    audit.record("account.update", target_user_id=user_id, details=changed, request=request)
    log.info("admin updated account %s", user_id)
    return {"user": item}


#: Stripe statuses that block an admin delete: the subscription is still
#: live in Stripe (active, trialing, or past_due inside its grace), so the
#: admin must cancel it in Stripe first. A canceled or incomplete row does
#: not block — there is nothing left to bill.
DELETE_BLOCKED_STATUSES = {"active", "trialing", "past_due"}


@router.delete("/accounts/{user_id}", dependencies=[Depends(require_admin)])
def admin_delete_account(user_id: str, request: Request) -> dict:
    """Delete an account (soft delete — the codebase's existing pattern).
    Sets deleted_at, so the account leaves the board list, the total_users
    count, the public seats counter, and the seat-cap count, and its email
    can be re-created later — the row itself stays, so manual grants,
    progress, and subscription records are never orphaned. An active manual
    grant is revoked at the same time (revoked_at stamped, reason recorded),
    so a deleted account keeps no paid access. Refused (409) while the
    account holds a live Stripe subscription — cancel it in Stripe first,
    then delete from the board."""
    with db.SessionLocal() as s:
        user = _require_account(s, user_id)
        sub = s.get(Subscription, user_id)
        if sub is not None and sub.status in DELETE_BLOCKED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This account has an active Stripe subscription. Cancel it in Stripe first, then delete the account.",
            )
        grant = s.get(ManualGrant, user_id)
        if grant is not None and grant.revoked_at is None:
            grant.revoked_at = _now()
            grant.revoked_note = "Account deleted."
        user.deleted_at = _now()
        s.commit()
    enrollment.sync_user_safely(user_id)  # a deleted account frees its place
    audit.record("account.delete", target_user_id=user_id, request=request)
    log.info("admin deleted account %s", user_id)
    return {"ok": True, "deleted_user_id": user_id}


@router.post("/accounts/{user_id}/manual-grant", dependencies=[Depends(require_admin)], status_code=status.HTTP_201_CREATED)
def admin_grant_access(user_id: str, request: Request, body: dict | None = None) -> dict:
    """Grant paid access to an existing account (mark paid). A grant lasts
    until revoked from the board — it is not a Stripe subscription and it
    never writes the subscriptions table."""
    note = _clean_note((body or {}).get("note")) if isinstance(body, dict) else ""
    if len(note) > MAX_NOTE_CHARS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Note must be at most 500 characters."
        )
    with db.SessionLocal() as s:
        _require_account(s, user_id)
        grant = s.get(ManualGrant, user_id)
        if grant is not None and grant.revoked_at is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This account already has an active manual grant.",
            )
        _require_room(user_id)
        if grant is None:
            grant = ManualGrant(user_id=user_id, note=note)
            s.add(grant)
        else:  # re-grant after a revoke: a fresh grant period on the same row
            grant.note = note
            grant.granted_at = _now()
            grant.revoked_at = None
            grant.revoked_note = None
        s.commit()
        result = {"manual_grant": _grant_dict(grant)}
    enrollment.sync_user(user_id)
    audit.record("grant.create", target_user_id=user_id, request=request)
    log.info("admin granted manual access to %s", user_id)
    return result


@router.post("/accounts/{user_id}/manual-grant/revoke", dependencies=[Depends(require_admin)])
def admin_revoke_access(user_id: str, request: Request, body: dict | None = None) -> dict:
    """Revoke a manual grant. Stamps revoked_at (and the reason) — the row is
    never deleted, so the record of the grant survives. Idempotent: a grant
    that is already revoked is returned unchanged."""
    note = _clean_note((body or {}).get("note")) if isinstance(body, dict) else ""
    if len(note) > MAX_NOTE_CHARS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Note must be at most 500 characters."
        )
    with db.SessionLocal() as s:
        _require_account(s, user_id)
        grant = s.get(ManualGrant, user_id)
        if grant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="This account has no manual grant."
            )
        if grant.revoked_at is None:
            grant.revoked_at = _now()
            grant.revoked_note = note
            s.commit()
        result = {"manual_grant": _grant_dict(grant)}
    enrollment.sync_user_safely(user_id)  # frees the place unless a Stripe subscription still holds it
    audit.record("grant.revoke", target_user_id=user_id, request=request)
    log.info("admin revoked manual access for %s", user_id)
    return result


# ---------- enrollment capacity ----------

@router.get("/enrollment", dependencies=[Depends(require_admin)])
def admin_enrollment() -> dict:
    """Capacity, places taken (online / in person / reserved), complimentary
    places, and the recent admin activity."""
    return {"enrollment": enrollment.summary(), "recent_activity": audit.recent(20)}


@router.put("/enrollment/settings", dependencies=[Depends(require_admin)])
def admin_enrollment_settings(body: dict, request: Request) -> dict:
    """Change the paid and/or complimentary capacity. Validated: whole
    numbers, never below the places already taken. Audited."""
    if not isinstance(body, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request body.")
    paid = body.get("paid_capacity")
    comp = body.get("comp_capacity")
    if paid is None and comp is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update.")
    try:
        before, after = enrollment.update_settings(paid_capacity=paid, comp_capacity=comp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    audit.record("enrollment.settings", details={"before": before, "after": after}, request=request)
    return {"enrollment": enrollment.summary()}


@router.post("/enrollment/reconcile", dependencies=[Depends(require_admin)])
def admin_enrollment_reconcile(request: Request) -> dict:
    """Re-derive every place from the Stripe rows and manual grants."""
    report = enrollment.reconcile()
    audit.record("enrollment.reconcile", details=report, request=request)
    return {"report": report, "enrollment": enrollment.summary()}


# ---------- report ----------

#: The report carries the full accounts list (the accounts tab is paginated;
#: a report is not) — capped so one download cannot dump an unbounded table.
REPORT_ACCOUNTS_CAP = 1000
#: Recent AI calls carried in the report (JSON and CSV alike).
REPORT_RECENT_CALLS = 100
REPORT_SECTIONS = ("all", "overview", "accounts", "subscriptions", "ai-costs")


def _all_account_items(cap: int = REPORT_ACCOUNTS_CAP) -> dict:
    """Every non-deleted account, newest first, in accounts-list shape."""
    with db.SessionLocal() as s:
        total = s.query(func.count()).select_from(User).filter(User.deleted_at.is_(None)).scalar() or 0
        users = (
            s.query(User)
            .filter(User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
            .limit(cap)
            .all()
        )
        maps = _account_maps(s, [u.id for u in users])
    items = [
        _account_item(
            u,
            maps["subs"].get(u.id),
            maps["progress"].get(u.id),
            maps["last_seen"].get(u.id),
            maps["labs"].get(u.id, 0),
            maps["grants"].get(u.id),
        )
        for u in users
    ]
    return {"total": total, "items": items, "truncated": total > len(items)}


def _report_data(days: int = 30) -> dict:
    """The whole admin board as one report: overview, every account, every
    subscription record, AI costs for the window. The sub-objects are the
    same shapes the tabs return, so the on-screen report reuses the tab
    components and the CSV renders the same figures."""
    days = min(max(days, 1), 365)
    return {
        "generated_at": _now().isoformat(),
        "days": days,
        "overview": admin_overview(),
        "accounts": _all_account_items(),
        "subscriptions": admin_subscriptions(),
        "ai_costs": admin_ai_calls(days=days, page=1, page_size=REPORT_RECENT_CALLS),
    }


@router.get("/report", dependencies=[Depends(require_admin)])
def admin_report(days: int = 30) -> dict:
    """On-screen report data: the same figures as the tabs, in one payload."""
    return _report_data(days)


def _report_csv(data: dict, section: str) -> str:
    """The report as CSV. One file, one block per section, each with its own
    header row — the same figures as the on-screen report, never invented.
    "unknown" stays "unknown" where the data genuinely does not exist."""
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["Road to CISSP admin report", data["generated_at"]])
    w.writerow([])
    ov = data["overview"]
    if section in ("all", "overview"):
        w.writerow(["Overview"])
        w.writerow(["Accounts", ov["total_users"]])
        w.writerow(["Paying subscribers (Stripe)", ov["paying_subscribers"]])
        w.writerow(["Manual enrollments (active)", ov["manual_grants_active"]])
        mrr = ov["mrr"]
        w.writerow(["Monthly recurring revenue (USD)", mrr["amount"] if mrr else "unknown"])
        w.writerow(["AI tutor cost, last 30 days (USD)", ov["ai_cost_30d_usd"]])
        w.writerow(["AI tutor calls, last 30 days", ov["ai_calls_30d"]])
        w.writerow([])
    if section in ("all", "accounts"):
        w.writerow(["Accounts"])
        w.writerow(["Name", "Email", "Signed up", "Last active", "Lessons passed", "Labs done", "Stripe subscription", "Manual grant"])
        for a in data["accounts"]["items"]:
            g = a.get("manual_grant") or {}
            grant = "none" if not g else ("active" if g.get("active") else "revoked")
            w.writerow([
                a["display_name"],
                a["email"],
                a["created_at"] or "unknown",
                a["last_active"] or "unknown",
                a["lessons_passed"],
                a["labs_completed"],
                a["subscription_status"],
                grant,
            ])
        if data["accounts"].get("truncated"):
            w.writerow([f"Truncated to the first {len(data['accounts']['items'])} accounts."])
        w.writerow([])
    if section in ("all", "subscriptions"):
        w.writerow(["Subscriptions (stored Stripe state)"])
        w.writerow(["Name", "Email", "Status", "Current period ends", "Stripe customer", "Stripe subscription"])
        for s in data["subscriptions"]["items"]:
            w.writerow([
                s["display_name"],
                s["email"],
                s["status"],
                s["current_period_end"] or "unknown",
                s["stripe_customer_id"] or "unknown",
                s["stripe_subscription_id"] or "unknown",
            ])
        w.writerow([])
    ai = data["ai_costs"]
    if section in ("all", "ai-costs"):
        w.writerow([f"AI costs — last {ai['days']} days"])
        w.writerow(["Calls", ai["totals"]["calls"]])
        w.writerow(["Prompt tokens", ai["totals"]["prompt_tokens"]])
        w.writerow(["Completion tokens", ai["totals"]["completion_tokens"]])
        w.writerow(["Cost (USD)", ai["totals"]["cost_usd"]])
        w.writerow([])
        w.writerow(["Calls per day"])
        w.writerow(["Day", "Calls", "Cost (USD)"])
        for d in ai["per_day"]:
            w.writerow([d["day"], d["calls"], d["cost_usd"]])
        w.writerow([])
        w.writerow(["Top users by cost"])
        w.writerow(["Name", "Email", "Calls", "Cost (USD)"])
        for u in ai["per_user"]:
            w.writerow([u["display_name"] or "", u["email"] or "", u["calls"], u["cost_usd"]])
        w.writerow([])
        w.writerow(["Recent calls"])
        w.writerow(["When", "Name", "Email", "Mode", "Model", "Prompt tokens", "Completion tokens", "Cost (USD)", "Cached", "Error"])
        for c in ai["recent"]:
            w.writerow([
                c["created_at"] or "unknown",
                c["display_name"] or "",
                c["email"] or "",
                c["mode"],
                c["model"],
                c["prompt_tokens"] if c["prompt_tokens"] is not None else "unknown",
                c["completion_tokens"] if c["completion_tokens"] is not None else "unknown",
                c["cost_usd"] if c["cost_usd"] is not None else "unknown",
                "yes" if c["cached"] else "no",
                "yes" if c["error"] else "no",
            ])
    return out.getvalue()


@router.get("/report.csv", dependencies=[Depends(require_admin)])
def admin_report_csv(days: int = 30, section: str = "all"):
    """The report as a CSV download. Same data as GET /admin/report;
    `section` picks one block (overview, accounts, subscriptions, ai-costs)
    or all of them."""
    if section not in REPORT_SECTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown report section."
        )
    body = _report_csv(_report_data(days), section)
    filename = f"admin-report-{_now().date().isoformat()}.csv"
    return StreamingResponse(
        io.StringIO(body),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
