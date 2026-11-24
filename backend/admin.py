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

import admin_auth
import audit
import db
import enrollment
from auth.deps import resolve_user_id
from db_models import AdminMfa, AiTutorCall, AuthSession, LabCompletion, ManualGrant, Progress, Review, Subscription, User

log = logging.getLogger("admin")

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_COOKIE = admin_auth.ADMIN_COOKIE
#: Lessons count as passed at the same bar as the learner UI (src/lib/progress/engine.js).
PASS_PCT = 70

#: Admin sign-in brute-force limit: failed MFA codes per client IP in a
#: window, then 429 with Retry-After. Module-level so tests can patch the
#: window. In-memory, per process (prod runs one worker). A wrong code is
#: also never accepted twice (admin_auth.verify_totp replay guard).
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


def require_admin(request: Request) -> str:
    """Dependency: the admin's user id, or 401/403.

    401 unless this browser holds a live admin session for the same account
    that is signed in to the site, still allow-listed and MFA-enrolled (see
    admin_auth.session_user). 403 for a state-changing request without the
    session's CSRF token in X-CSRF-Token. Never trusts a frontend role flag.
    """
    raw = request.cookies.get(ADMIN_COOKIE)
    admin_id = admin_auth.session_user(raw, resolve_user_id(request))
    if admin_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if request.method not in admin_auth.SAFE_METHODS:
        sent = request.headers.get(admin_auth.CSRF_HEADER, "")
        if not sent or not hmac.compare_digest(sent, admin_auth.csrf_token(raw)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing or invalid CSRF token.")
    request.state.admin_user_id = admin_id  # audit.record reads it as the actor
    return admin_id


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
    # Log IP + timestamp only — never the attempted code.
    log.warning("admin sign-in failed from %s at %s", ip, _now().isoformat())
    _admin_login_attempts[ip].append(time.time())


def _guard_rate(request: Request) -> str:
    ip = _client_ip(request)
    retry_after = _admin_login_retry_after(ip)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )
    return ip


def _eligible_admin(request: Request) -> tuple[str, str]:
    """(user_id, verified email) of the signed-in, allow-listed caller, else 401/403."""
    user_id = resolve_user_id(request)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in first.")
    with db.SessionLocal() as s:
        email = admin_auth.eligible_email(s, user_id)
    if email is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is not an admin.")
    return user_id, email


def _start_session(response: Response, user_id: str) -> dict:
    raw = admin_auth.create_session(user_id)
    response.set_cookie(ADMIN_COOKIE, raw, **admin_auth.cookie_kwargs())
    return {"ok": True, "csrf_token": admin_auth.csrf_token(raw)}


@router.get("/status")
def admin_status(request: Request) -> dict:
    """Where the caller stands: signed in to the site? allow-listed? MFA set up?
    admin session live? The page uses it to show the right step. The CSRF
    token is returned only to a live admin session."""
    user_id = resolve_user_id(request)
    raw = request.cookies.get(ADMIN_COOKIE)
    out = {"authenticated": False, "signed_in": bool(user_id), "eligible": False, "mfa_enrolled": False}
    if not user_id:
        return out
    with db.SessionLocal() as s:
        email = admin_auth.eligible_email(s, user_id)
        mfa = admin_auth.mfa_state(s, user_id) if email else None
    if email is None:
        return out
    out.update(eligible=True, email=email, mfa_enrolled=bool(mfa and mfa.enabled_at))
    if admin_auth.session_user(raw, user_id):
        out.update(authenticated=True, csrf_token=admin_auth.csrf_token(raw))
    return out


@router.post("/mfa/setup")
def admin_mfa_setup(request: Request) -> dict:
    """First-time setup: a new authenticator secret for the signed-in admin.
    Refused once MFA is enabled (resetting is a server-side command only)."""
    user_id, email = _eligible_admin(request)
    secret = admin_auth.new_totp_secret()
    with db.SessionLocal() as s:
        mfa = admin_auth.mfa_state(s, user_id)
        if mfa is not None and mfa.enabled_at is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Two-step sign-in is already set up.")
        if mfa is None:
            mfa = AdminMfa(user_id=user_id, last_step=0)
            s.add(mfa)
        mfa.pending_secret_enc = admin_auth.encrypt_secret(secret)
        s.commit()
    return {"secret": secret, "otpauth_uri": admin_auth.otpauth_uri(secret, email)}


@router.post("/mfa/activate")
def admin_mfa_activate(body: dict, request: Request, response: Response) -> dict:
    """Confirm the first code from the new authenticator: MFA is now on, and
    the admin is signed in."""
    ip = _guard_rate(request)
    user_id, _email = _eligible_admin(request)
    code = body.get("code") if isinstance(body, dict) else None
    with db.SessionLocal() as s:
        mfa = admin_auth.mfa_state(s, user_id)
        if mfa is None or not mfa.pending_secret_enc or mfa.enabled_at is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Start the setup first.")
        secret = admin_auth.decrypt_secret(mfa.pending_secret_enc)
        step = admin_auth.verify_totp(secret, code, mfa.last_step)
        if step is None:
            _record_admin_login_failure(ip)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="That code didn't match. Try the next one.")
        mfa.secret_enc = mfa.pending_secret_enc
        mfa.pending_secret_enc = None
        mfa.enabled_at = _now()
        mfa.last_step = step
        s.commit()
    _admin_login_attempts.pop(ip, None)
    result = _start_session(response, user_id)
    audit.record("admin.mfa_enrolled", actor=user_id, target_user_id=user_id, request=request)
    return result


@router.post("/login")
def admin_login(body: dict, request: Request, response: Response) -> dict:
    """Admin sign-in: the signed-in, allow-listed account + a current code
    from its authenticator. Generic failure; rate-limited per IP."""
    ip = _guard_rate(request)
    user_id, _email = _eligible_admin(request)
    code = body.get("code") if isinstance(body, dict) else None
    with db.SessionLocal() as s:
        mfa = admin_auth.mfa_state(s, user_id)
        if mfa is None or mfa.enabled_at is None or not mfa.secret_enc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Set up two-step sign-in first.")
        step = admin_auth.verify_totp(admin_auth.decrypt_secret(mfa.secret_enc), code, mfa.last_step)
        if step is None:
            _record_admin_login_failure(ip)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code.")
        mfa.last_step = step
        s.commit()
    _admin_login_attempts.pop(ip, None)
    result = _start_session(response, user_id)
    audit.record("admin.login", actor=user_id, target_user_id=user_id, request=request)
    return result


@router.post("/logout")
def admin_logout(request: Request, response: Response) -> dict:
    admin_auth.delete_session(request.cookies.get(ADMIN_COOKIE))
    response.delete_cookie(ADMIN_COOKIE, path="/")
    return {"ok": True}


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


# ---------- reviews moderation ----------


def _review_item(r: Review, name: str, email: str | None) -> dict:
    """One review row for the board. The author's name/email are shown to
    the admin only so a bad-faith review can be traced — they never appear
    on the public page (see public.py)."""
    return {
        "id": r.id,
        "user_id": r.user_id,
        "display_name": name,
        "email": email,
        "rating": r.rating,
        "body": r.body,
        "review_display_name": r.display_name,
        "approved": r.approved,
        "created_at": _iso(r.created_at),
    }


@router.get("/reviews", dependencies=[Depends(require_admin)])
def admin_reviews() -> dict:
    """All reviews, pending first, then newest. Unapproved reviews are the
    moderation queue; approved ones are already live on /reviews."""
    with db.SessionLocal() as s:
        rows = (
            s.query(Review)
            .order_by(Review.approved.asc(), Review.created_at.desc())
            .all()
        )
        names = {
            u.id: (u.display_name or "", u.email)
            for u in s.query(User).filter(User.id.in_([r.user_id for r in rows])).all()
        } if rows else {}
    return {
        "reviews": [
            _review_item(r, *names.get(r.user_id, ("", None))) for r in rows
        ]
    }


@router.post("/reviews/{review_id}/approve", dependencies=[Depends(require_admin)])
def admin_approve_review(review_id: str, request: Request) -> dict:
    """Approve a review: it goes live on the public page. Audited."""
    with db.SessionLocal() as s:
        review = s.get(Review, review_id)
        if review is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
        review.approved = True
        s.commit()
        user_id = review.user_id
    audit.record("review.approve", target_user_id=user_id,
                 details={"review_id": review_id}, request=request)
    log.info("admin approved review %s", review_id)
    return {"ok": True, "id": review_id, "approved": True}


@router.post("/reviews/{review_id}/reject", dependencies=[Depends(require_admin)])
def admin_reject_review(review_id: str, request: Request) -> dict:
    """Reject a review: the row is DELETED (decided: no rejected-review
    graveyard — a rejected review is gone, and the author may submit again).
    Audited."""
    with db.SessionLocal() as s:
        review = s.get(Review, review_id)
        if review is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
        user_id = review.user_id
        s.delete(review)
        s.commit()
    audit.record("review.reject", target_user_id=user_id,
                 details={"review_id": review_id}, request=request)
    log.info("admin rejected (deleted) review %s", review_id)
    return {"ok": True, "id": review_id, "deleted": True}


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
