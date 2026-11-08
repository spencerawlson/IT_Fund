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

import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, or_

import db
from db_models import AiTutorCall, AuthSession, LabCompletion, Progress, Subscription, User

log = logging.getLogger("admin")

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_COOKIE = "rtc_admin"
ADMIN_SESSION_HOURS = 24
#: Lessons count as passed at the same bar as the learner UI (src/lib/progress/engine.js).
PASS_PCT = 70


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


@router.post("/login")
def admin_login(body: dict, response: Response) -> dict:
    """Password gate. Generic failure either way: never reveal whether the
    password is unset or merely wrong."""
    if not _password_ok(body.get("password") if isinstance(body, dict) else None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password"
        )
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
        total_users = s.query(func.count()).select_from(User).scalar() or 0
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
    return {
        "total_users": total_users,
        "paying_subscribers": paying,
        "subscriptions_by_status": subs,
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
            like = f"%{needle}%"
            query = query.filter(
                or_(User.display_name.ilike(like), User.email.ilike(like))
            )
        total = query.count()
        users = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        ids = [u.id for u in users]
        subs = {r.user_id: r for r in s.query(Subscription).filter(Subscription.user_id.in_(ids)).all()} if ids else {}
        progress = {r.user_id: r for r in s.query(Progress).filter(Progress.user_id.in_(ids)).all()} if ids else {}
        last_seen = {
            r.user_id: r.last
            for r in s.query(AuthSession.user_id, func.max(AuthSession.last_seen_at).label("last"))
            .filter(AuthSession.user_id.in_(ids))
            .group_by(AuthSession.user_id)
            .all()
        } if ids else {}
        labs = {
            r.user_id: r.n
            for r in s.query(LabCompletion.user_id, func.count().label("n"))
            .filter(LabCompletion.user_id.in_(ids))
            .group_by(LabCompletion.user_id)
            .all()
        } if ids else {}
    items = []
    for u in users:
        sub = subs.get(u.id)
        prog = progress.get(u.id)
        seen = _aware(last_seen.get(u.id))
        updated = _aware(prog.updated_at) if prog else None
        last_active = max([d for d in (seen, updated) if d], default=None)
        items.append(
            {
                "id": u.id,
                "display_name": u.display_name or "",
                "email": u.email,
                "created_at": _iso(u.created_at),
                "last_active": _iso(last_active),
                "lessons_passed": _lessons_passed(prog.state if prog else None),
                "labs_completed": labs.get(u.id, 0),
                "subscription_status": sub.status if sub else "none",
                "subscription_period_end": _iso(sub.current_period_end) if sub else None,
            }
        )
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
