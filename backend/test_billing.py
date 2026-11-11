"""Tests for Stripe billing (backend/billing.py). Stripe is fully mocked — no network."""
import os
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# ---- fake stripe module (the real package may not be installed) ----
fake_stripe = types.ModuleType("stripe")
fake_stripe.api_key = None


class _FakeCheckoutSession:
    @staticmethod
    def create(**kwargs):
        _calls["checkout_create"] = kwargs
        return types.SimpleNamespace(url="https://checkout.stripe.test/s/abc", id="cs_test_1")


class _FakeCustomer:
    @staticmethod
    def create(**kwargs):
        _calls["customer_create"] = kwargs
        return types.SimpleNamespace(id="cus_test_1")


class _FakeSubscription:
    cancel_calls = []
    cancel_mode = "ok"  # "ok" | "already_canceled" | "fail"

    @staticmethod
    def retrieve(sub_id):
        _calls["sub_retrieve"] = sub_id
        return {
            "id": sub_id,
            "customer": "cus_test_1",
            "status": "active",
            "current_period_end": 1893456000,  # 2030-01-01
            "metadata": {},
        }

    @staticmethod
    def cancel(sub_id):
        _FakeSubscription.cancel_calls.append(sub_id)
        if _FakeSubscription.cancel_mode == "already_canceled":
            raise RuntimeError("subscription already canceled")
        if _FakeSubscription.cancel_mode == "fail":
            raise RuntimeError("stripe down")
        return {"id": sub_id, "status": "canceled"}


class _FakeInvoice:
    subscription = "sub_test_1"

    @staticmethod
    def retrieve(invoice_id):
        _calls["invoice_retrieve"] = invoice_id
        return types.SimpleNamespace(subscription=_FakeInvoice.subscription, id=invoice_id)


class _FakePortalSession:
    @staticmethod
    def create(**kwargs):
        _calls["portal_create"] = kwargs
        return types.SimpleNamespace(url="https://billing.stripe.test/p/abc")


class _FakeWebhook:
    mode = "ok"  # "ok" | "bad_sig"

    @staticmethod
    def construct_event(payload, sig, secret):
        if _FakeWebhook.mode == "bad_sig":
            raise ValueError("bad signature")
        _calls["webhook_secret"] = secret
        import json

        return json.loads(payload.decode())


fake_stripe.checkout = types.SimpleNamespace(Session=_FakeCheckoutSession)
fake_stripe.Customer = _FakeCustomer
fake_stripe.Subscription = _FakeSubscription
fake_stripe.Invoice = _FakeInvoice
fake_stripe.billing_portal = types.SimpleNamespace(Session=_FakePortalSession)
fake_stripe.Webhook = _FakeWebhook
sys.modules["stripe"] = fake_stripe

_calls = {}

from fastapi.testclient import TestClient  # noqa: E402

import billing  # noqa: E402
import db  # noqa: E402
import main  # noqa: E402
from auth.identity import OAuthIdentity, upsert_identity  # noqa: E402
from auth.sessions import COOKIE_NAME, create_session  # noqa: E402
from db_models import Subscription  # noqa: E402

client = TestClient(main.app)

KEYS = {
    "STRIPE_SECRET_KEY": "sk_test_fake",
    "STRIPE_WEBHOOK_SECRET": "whsec_fake",
    "STRIPE_PRICE_ID": "price_fake",
}


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    _calls.clear()
    _FakeWebhook.mode = "ok"
    _FakeSubscription.cancel_calls = []
    _FakeSubscription.cancel_mode = "ok"
    _FakeInvoice.subscription = "sub_test_1"
    for k, v in KEYS.items():
        os.environ[k] = v


def teardown_function():
    for k in KEYS:
        os.environ.pop(k, None)


def _signed_in(sub="u1", email="u1@example.com"):
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("google", sub, email, True, "U"))
        raw = create_session(s, user.id)
        s.commit()
        uid = user.id
    return {COOKIE_NAME: raw}, uid


def _set_sub(uid, status="active", customer="cus_test_1", current_period_end=None,
             past_due_since=None, sub_id="sub_test_1"):
    with db.SessionLocal() as s:
        s.merge(
            Subscription(
                user_id=uid,
                stripe_customer_id=customer,
                stripe_subscription_id=sub_id,
                status=status,
                current_period_end=current_period_end,
                past_due_since=past_due_since,
            )
        )
        s.commit()


# ---------- is_subscribed ----------


def test_is_subscribed_active_and_trialing():
    _, uid = _signed_in()
    assert billing.is_subscribed(uid) is False
    _set_sub(uid, "active")
    assert billing.is_subscribed(uid) is True
    _set_sub(uid, "trialing")
    assert billing.is_subscribed(uid) is True
    _set_sub(uid, "canceled")
    assert billing.is_subscribed(uid) is False
    _set_sub(uid, "past_due")
    assert billing.is_subscribed(uid) is False


def test_is_subscribed_enforces_current_period_end():
    # F-10: an active row whose period provably ended grants no access.
    _, uid = _signed_in()
    now = datetime.now(timezone.utc)
    _set_sub(uid, "active", current_period_end=now - timedelta(days=1))
    assert billing.is_subscribed(uid) is False
    _set_sub(uid, "active", current_period_end=now + timedelta(days=30))
    assert billing.is_subscribed(uid) is True
    _set_sub(uid, "trialing", current_period_end=now - timedelta(days=1))
    assert billing.is_subscribed(uid) is False
    # Within the 5-minute clock-skew grace, a just-ended period still counts.
    _set_sub(uid, "active", current_period_end=now - timedelta(minutes=2))
    assert billing.is_subscribed(uid) is True
    # No period end recorded (legacy row): the status alone decides.
    _set_sub(uid, "active", current_period_end=None)
    assert billing.is_subscribed(uid) is True


def test_is_subscribed_past_due_seven_day_grace():
    # Policy (2026-11-11): past_due keeps access for 7 days from the day it
    # went past_due, then access is revoked.
    _, uid = _signed_in()
    now = datetime.now(timezone.utc)
    _set_sub(uid, "past_due", past_due_since=now - timedelta(days=3))
    assert billing.is_subscribed(uid) is True
    _set_sub(uid, "past_due", past_due_since=now - timedelta(days=6, hours=23))
    assert billing.is_subscribed(uid) is True
    _set_sub(uid, "past_due", past_due_since=now - timedelta(days=8))
    assert billing.is_subscribed(uid) is False
    # No anchor (legacy row, never synced since the anchor shipped): fail closed.
    _set_sub(uid, "past_due", past_due_since=None)
    assert billing.is_subscribed(uid) is False


def test_past_due_grace_flows_through_status_endpoint():
    cookies, uid = _signed_in()
    now = datetime.now(timezone.utc)
    _set_sub(uid, "past_due", past_due_since=now - timedelta(days=1))
    r = client.get("/api/billing/status", cookies=cookies)
    assert r.json()["subscribed"] is True
    assert r.json()["status"] == "past_due"
    _set_sub(uid, "past_due", past_due_since=now - timedelta(days=8))
    r = client.get("/api/billing/status", cookies=cookies)
    assert r.json()["subscribed"] is False


def test_owner_bypass_never_billed(monkeypatch):
    monkeypatch.setenv("BILLING_OWNER_EMAILS", "owner@example.com, second@example.com")
    _, owner_uid = _signed_in(sub="owner1", email="Owner@Example.com")  # case-insensitive
    _, other_uid = _signed_in(sub="other1", email="other@example.com")
    assert billing.is_owner(owner_uid) is True
    assert billing.is_subscribed(owner_uid) is True  # no subscription row needed
    assert billing.is_owner(other_uid) is False
    assert billing.is_subscribed(other_uid) is False


# ---------- auth + 503 gating ----------


def test_checkout_requires_auth():
    client.cookies.clear()
    assert client.post("/api/billing/checkout").status_code == 401


def test_checkout_503_without_key():
    cookies, _ = _signed_in()
    os.environ.pop("STRIPE_SECRET_KEY")
    r = client.post("/api/billing/checkout", cookies=cookies)
    assert r.status_code == 503
    assert "STRIPE_SECRET_KEY" in r.json()["detail"]


def test_status_works_without_stripe_key():
    # F-04: GET /billing/status is a local DB read — it must not require
    # Stripe to be configured.
    cookies, uid = _signed_in()
    os.environ.pop("STRIPE_SECRET_KEY")
    r = client.get("/api/billing/status", cookies=cookies)
    assert r.status_code == 200
    assert r.json() == {"subscribed": False, "status": "none", "current_period_end": None}
    _set_sub(uid, "active")
    r = client.get("/api/billing/status", cookies=cookies)
    assert r.status_code == 200
    assert r.json()["subscribed"] is True
    assert r.json()["status"] == "active"


# ---------- checkout ----------


def test_checkout_creates_session_and_customer():
    cookies, uid = _signed_in()
    r = client.post("/api/billing/checkout", cookies=cookies)
    assert r.status_code == 200
    assert r.json()["checkout_url"].startswith("https://checkout.stripe.test/")
    assert _calls["checkout_create"]["customer"] == "cus_test_1"
    assert _calls["checkout_create"]["mode"] == "subscription"
    assert _calls["checkout_create"]["line_items"] == [{"price": "price_fake", "quantity": 1}]
    # customer row persisted
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert row is not None and row.stripe_customer_id == "cus_test_1"


def test_checkout_reuses_existing_customer():
    cookies, uid = _signed_in()
    _set_sub(uid, "canceled", customer="cus_existing")
    r = client.post("/api/billing/checkout", cookies=cookies)
    assert r.status_code == 200
    assert _calls["checkout_create"]["customer"] == "cus_existing"
    assert "customer_create" not in _calls  # no duplicate customer


def _checkout(cookies, attribution_tag=None):
    import json

    if attribution_tag is None:
        return client.post("/api/billing/checkout", cookies=cookies)
    return client.post(
        "/api/billing/checkout",
        cookies=cookies,
        content=json.dumps({"attribution_tag": attribution_tag}).encode(),
        headers={"Content-Type": "application/json"},
    )


def test_checkout_passes_ventoryn_attribution_when_configured(monkeypatch):
    monkeypatch.setenv("VENTORYN_SITE_ID", "aaaaaaaaaaaaaaaaaaaaaaaa")
    cookies, uid = _signed_in()
    r = _checkout(cookies, attribution_tag="vtn_abc123.def456")
    assert r.status_code == 200
    assert _calls["checkout_create"]["metadata"] == {
        "user_id": uid,
        "ventoryn_site_id": "aaaaaaaaaaaaaaaaaaaaaaaa",
        "ventoryn_tag": "vtn_abc123.def456",
    }
    with db.SessionLocal() as s:
        from db_models import User

        assert s.get(User, uid).attribution_tag == "vtn_abc123.def456"


def test_checkout_always_carries_the_default_site_id():
    # No VENTORYN_SITE_ID set: the Road to CISSP default is used, so
    # Ventoryn counts every sale (attributed when a tag rides along).
    cookies, uid = _signed_in()
    r = _checkout(cookies)
    assert r.status_code == 200
    assert _calls["checkout_create"]["metadata"] == {
        "user_id": uid, "ventoryn_site_id": "418e926be25e251d95badb9e"}


def test_checkout_ventoryn_metadata_can_be_turned_off(monkeypatch):
    # "off" (or any malformed id) keeps Ventoryn metadata out entirely,
    # but the tag is still recorded on the user's own row.
    monkeypatch.setenv("VENTORYN_SITE_ID", "off")
    cookies, uid = _signed_in()
    r = _checkout(cookies, attribution_tag="vtn_abc123.def456")
    assert r.status_code == 200
    assert _calls["checkout_create"]["metadata"] == {"user_id": uid}
    with db.SessionLocal() as s:
        from db_models import User

        assert s.get(User, uid).attribution_tag == "vtn_abc123.def456"


def test_checkout_rejects_malformed_attribution_tag(monkeypatch):
    monkeypatch.setenv("VENTORYN_SITE_ID", "aaaaaaaaaaaaaaaaaaaaaaaa")
    cookies, uid = _signed_in()
    r = _checkout(cookies, attribution_tag="<script>alert(1)</script>")
    assert r.status_code == 200
    assert _calls["checkout_create"]["metadata"] == {
        "user_id": uid, "ventoryn_site_id": "aaaaaaaaaaaaaaaaaaaaaaaa"}
    with db.SessionLocal() as s:
        from db_models import User

        assert s.get(User, uid).attribution_tag is None


def test_checkout_attribution_is_first_touch_only(monkeypatch):
    monkeypatch.setenv("VENTORYN_SITE_ID", "aaaaaaaaaaaaaaaaaaaaaaaa")
    cookies, uid = _signed_in()
    _checkout(cookies, attribution_tag="vtn_first.aaa111")
    r = _checkout(cookies, attribution_tag="vtn_second.bbb222")
    assert r.status_code == 200
    # Later checkout calls still pass through whatever tag arrives (the
    # frontend itself is first-touch — see attribution.test.js), but the
    # user's own recorded tag never changes once set.
    assert _calls["checkout_create"]["metadata"]["ventoryn_tag"] == "vtn_second.bbb222"
    with db.SessionLocal() as s:
        from db_models import User

        assert s.get(User, uid).attribution_tag == "vtn_first.aaa111"


def test_checkout_works_with_no_body_at_all():
    # The existing no-body call path (pre-attribution) must keep working.
    cookies, uid = _signed_in()
    r = client.post("/api/billing/checkout", cookies=cookies)
    assert r.status_code == 200
    assert _calls["checkout_create"]["metadata"] == {
        "user_id": uid, "ventoryn_site_id": "418e926be25e251d95badb9e"}


def test_checkout_503_without_price():
    cookies, _ = _signed_in()
    os.environ.pop("STRIPE_PRICE_ID")
    r = client.post("/api/billing/checkout", cookies=cookies)
    assert r.status_code == 503
    assert "STRIPE_PRICE_ID" in r.json()["detail"]


def test_checkout_409_when_already_subscribed():
    # F-07: an active subscriber must not get a second Checkout Session.
    cookies, uid = _signed_in()
    _set_sub(uid, "active")
    r = client.post("/api/billing/checkout", cookies=cookies)
    assert r.status_code == 409
    assert "checkout_create" not in _calls  # no new Checkout Session


def test_checkout_passes_idempotency_key_and_subscription_data():
    # F-07 (idempotency key) + F-11 (user_id on the Subscription object).
    cookies, uid = _signed_in()
    r = client.post("/api/billing/checkout", cookies=cookies)
    assert r.status_code == 200
    assert _calls["checkout_create"]["idempotency_key"] == f"checkout:{uid}:price_fake"
    assert _calls["checkout_create"]["subscription_data"] == {
        "metadata": {"user_id": uid, "ventoryn_site_id": "418e926be25e251d95badb9e"}
    }


# ---------- status ----------


def test_status_none_when_never_subscribed():
    cookies, _ = _signed_in()
    r = client.get("/api/billing/status", cookies=cookies)
    assert r.status_code == 200
    assert r.json() == {"subscribed": False, "status": "none", "current_period_end": None}


def test_status_reflects_row():
    cookies, uid = _signed_in()
    _set_sub(uid, "active")
    r = client.get("/api/billing/status", cookies=cookies)
    body = r.json()
    assert body["subscribed"] is True and body["status"] == "active"


def test_status_reflects_expired_period_end():
    # F-10: /billing/status applies the same period-end rule as is_subscribed.
    cookies, uid = _signed_in()
    _set_sub(uid, "active", current_period_end=datetime.now(timezone.utc) - timedelta(days=1))
    r = client.get("/api/billing/status", cookies=cookies)
    assert r.json()["subscribed"] is False
    assert r.json()["status"] == "active"


def test_status_requires_auth():
    client.cookies.clear()
    assert client.get("/api/billing/status").status_code == 401


# ---------- portal ----------


def test_portal_404_without_customer():
    cookies, _ = _signed_in()
    r = client.post("/api/billing/portal", cookies=cookies)
    assert r.status_code == 404


def test_portal_returns_url():
    cookies, uid = _signed_in()
    _set_sub(uid, "active")
    r = client.post("/api/billing/portal", cookies=cookies)
    assert r.status_code == 200
    assert r.json()["portal_url"].startswith("https://billing.stripe.test/")
    assert _calls["portal_create"]["customer"] == "cus_test_1"


# ---------- webhook ----------


def _webhook_post(event: dict):
    import json

    return client.post(
        "/api/billing/webhook",
        content=json.dumps(event).encode(),
        headers={"stripe-signature": "t=1,v1=fake", "Content-Type": "application/json"},
    )


def test_webhook_rejects_bad_signature():
    _FakeWebhook.mode = "bad_sig"
    r = _webhook_post({"type": "checkout.session.completed", "data": {"object": {}}})
    assert r.status_code == 400


def test_webhook_checkout_completed_activates():
    cookies, uid = _signed_in()
    r = _webhook_post(
        {
            "type": "checkout.session.completed",
            "data": {"object": {"metadata": {"user_id": uid}, "subscription": "sub_test_1"}},
        }
    )
    assert r.status_code == 200
    assert r.json() == {"received": True}
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert row.status == "active"
        assert row.stripe_subscription_id == "sub_test_1"
        assert row.current_period_end is not None


def test_webhook_subscription_deleted_deactivates():
    _, uid = _signed_in()
    _set_sub(uid, "active")
    r = _webhook_post(
        {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_test_1",
                    "customer": "cus_test_1",
                    "status": "canceled",
                    "current_period_end": None,
                    "metadata": {"user_id": uid},
                }
            },
        }
    )
    assert r.status_code == 200
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "canceled"
    assert billing.is_subscribed(uid) is False


def test_webhook_unknown_event_acknowledged():
    r = _webhook_post({"type": "invoice.payment_succeeded", "data": {"object": {}}})
    assert r.status_code == 200
    assert r.json() == {"received": True}


def test_webhook_503_when_unconfigured():
    os.environ.pop("STRIPE_WEBHOOK_SECRET")
    r = _webhook_post({"type": "checkout.session.completed", "data": {"object": {}}})
    assert r.status_code == 503


def test_webhook_checkout_retrieve_failure_returns_5xx_then_retry_succeeds(monkeypatch):
    # F-02: a Stripe failure mid-handling must return 5xx (so Stripe
    # redelivers) — never a swallowed 200 — and the redelivery must
    # activate the user once retrieve is healthy again.
    _, uid = _signed_in()
    orig_retrieve = _FakeSubscription.retrieve
    state = {"fail": True}

    def flaky_retrieve(sub_id):
        if state["fail"]:
            raise RuntimeError("stripe down")
        return orig_retrieve(sub_id)

    monkeypatch.setattr(_FakeSubscription, "retrieve", staticmethod(flaky_retrieve))
    event = {
        "id": "evt_retry_1",
        "created": 1893456000,
        "type": "checkout.session.completed",
        "data": {"object": {"metadata": {"user_id": uid}, "subscription": "sub_test_1"}},
    }
    r = _webhook_post(event)
    assert r.status_code == 503
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid) is None
    assert billing.is_subscribed(uid) is False
    state["fail"] = False
    r = _webhook_post(event)
    assert r.status_code == 200
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "active"
    assert billing.is_subscribed(uid) is True


def test_webhook_db_failure_returns_5xx(monkeypatch):
    # F-02: a DB failure inside _sync_from_subscription must return 5xx.
    _, uid = _signed_in()

    def failing_sync(user_id, sub, event_created=None):
        raise RuntimeError("db down")

    monkeypatch.setattr(billing, "_sync_from_subscription", failing_sync)
    r = _webhook_post(
        {
            "id": "evt_dbfail_1",
            "created": 1893456000,
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test_1",
                    "customer": "cus_test_1",
                    "status": "active",
                    "current_period_end": 1893456000,
                    "metadata": {"user_id": uid},
                }
            },
        }
    )
    assert r.status_code == 503


def test_webhook_stale_updated_after_deleted_stays_canceled():
    # F-06: a delayed updated(active) older than the applied
    # deleted(canceled) must not resurrect the subscription.
    _, uid = _signed_in()
    _set_sub(uid, "active")
    r = _webhook_post(
        {
            "id": "evt_del_1",
            "created": 2000000000,
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_test_1",
                    "customer": "cus_test_1",
                    "status": "canceled",
                    "current_period_end": None,
                    "metadata": {"user_id": uid},
                }
            },
        }
    )
    assert r.status_code == 200
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "canceled"
    r = _webhook_post(
        {
            "id": "evt_stale_1",
            "created": 1000000000,
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test_1",
                    "customer": "cus_test_1",
                    "status": "active",
                    "current_period_end": 1893456000,
                    "metadata": {"user_id": uid},
                }
            },
        }
    )
    assert r.status_code == 200
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "canceled"
    assert billing.is_subscribed(uid) is False


def test_webhook_duplicate_event_id_applied_once(monkeypatch):
    # F-06: the same event id delivered twice must apply once.
    _, uid = _signed_in()
    orig_retrieve = _FakeSubscription.retrieve
    retrieves = []

    def counting_retrieve(sub_id):
        retrieves.append(sub_id)
        return orig_retrieve(sub_id)

    monkeypatch.setattr(_FakeSubscription, "retrieve", staticmethod(counting_retrieve))
    event = {
        "id": "evt_dup_1",
        "created": 1893456000,
        "type": "checkout.session.completed",
        "data": {"object": {"metadata": {"user_id": uid}, "subscription": "sub_test_1"}},
    }
    assert _webhook_post(event).status_code == 200
    assert _webhook_post(event).status_code == 200
    assert len(retrieves) == 1
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "active"


def test_webhook_subscription_event_with_metadata_needs_no_existing_row():
    # F-11: with user_id on the Subscription object (subscription_data),
    # a subscription event applies without any pre-existing row — no
    # customer-ID fallback lookup needed.
    _, uid = _signed_in()
    r = _webhook_post(
        {
            "id": "evt_meta_1",
            "created": 1893456000,
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test_1",
                    "customer": "cus_new_1",
                    "status": "active",
                    "current_period_end": 1893456000,
                    "metadata": {"user_id": uid},
                }
            },
        }
    )
    assert r.status_code == 200
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert row is not None and row.status == "active"
        assert row.stripe_subscription_id == "sub_test_1"
    assert billing.is_subscribed(uid) is True


# ---------- past_due grace anchor + charge.refunded ----------


def _past_due_event(uid, event_id, created, status="past_due"):
    return {
        "id": event_id,
        "created": created,
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_test_1",
                "customer": "cus_test_1",
                "status": status,
                "current_period_end": 1893456000,
                "metadata": {"user_id": uid},
            }
        },
    }


def test_webhook_past_due_sets_grace_anchor_once_then_clears_on_recovery():
    _, uid = _signed_in()
    _set_sub(uid, "active")
    now = int(datetime.now(timezone.utc).timestamp())
    r = _webhook_post(_past_due_event(uid, "evt_pd_1", now))
    assert r.status_code == 200
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert row.status == "past_due"
        # SQLite returns naive datetimes; treat them as UTC (same caveat as
        # billing._row_is_subscribed).
        assert row.past_due_since.replace(tzinfo=timezone.utc) == datetime.fromtimestamp(now, tz=timezone.utc)
    assert billing.is_subscribed(uid) is True  # inside the 7-day grace
    # A second updated(past_due) must NOT reset the clock.
    r = _webhook_post(_past_due_event(uid, "evt_pd_2", now + 86400))
    assert r.status_code == 200
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert row.past_due_since.replace(tzinfo=timezone.utc) == datetime.fromtimestamp(now, tz=timezone.utc)
    # Recovery clears the anchor.
    r = _webhook_post(_past_due_event(uid, "evt_pd_3", now + 172800, status="active"))
    assert r.status_code == 200
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert row.status == "active"
        assert row.past_due_since is None


def _refund_event(event_id, **charge):
    base = {"id": "ch_test_1", "amount": 1900, "amount_refunded": 1900,
            "invoice": "in_test_1", "customer": "cus_test_1"}
    base.update(charge)
    return {
        "id": event_id,
        "created": 1893456000,
        "type": "charge.refunded",
        "data": {"object": base},
    }


def test_webhook_charge_refunded_full_revokes_and_cancels():
    _, uid = _signed_in()
    _set_sub(uid, "active")
    event = _refund_event("evt_ref_1")
    r = _webhook_post(event)
    assert r.status_code == 200
    assert _calls["invoice_retrieve"] == "in_test_1"
    assert _FakeSubscription.cancel_calls == ["sub_test_1"]
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert row.status == "canceled"
        assert row.current_period_end is not None
    assert billing.is_subscribed(uid) is False
    # Redelivery is a no-op (idempotent): no second cancel.
    r = _webhook_post(event)
    assert r.status_code == 200
    assert _FakeSubscription.cancel_calls == ["sub_test_1"]


def test_webhook_charge_refunded_partial_changes_nothing():
    _, uid = _signed_in()
    _set_sub(uid, "active")
    r = _webhook_post(_refund_event("evt_ref_partial", amount_refunded=1000))
    assert r.status_code == 200
    assert "invoice_retrieve" not in _calls
    assert _FakeSubscription.cancel_calls == []
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "active"
    assert billing.is_subscribed(uid) is True


def test_webhook_charge_refunded_without_invoice_changes_nothing():
    _, uid = _signed_in()
    _set_sub(uid, "active")
    r = _webhook_post(_refund_event("evt_ref_noinv", invoice=None))
    assert r.status_code == 200
    assert _FakeSubscription.cancel_calls == []
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "active"


def test_webhook_charge_refunded_does_not_revoke_a_resubscription():
    # The learner resubscribed (new subscription id) after the old one was
    # refunded: the refund for the OLD subscription must not touch the new one.
    _, uid = _signed_in()
    _set_sub(uid, "active", sub_id="sub_new_1")
    r = _webhook_post(_refund_event("evt_ref_old"))
    assert r.status_code == 200
    assert _FakeSubscription.cancel_calls == []
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert row.status == "active"
        assert row.stripe_subscription_id == "sub_new_1"
    assert billing.is_subscribed(uid) is True


def test_webhook_charge_refunded_already_canceled_in_stripe_still_revokes():
    _, uid = _signed_in()
    _set_sub(uid, "active")
    _FakeSubscription.cancel_mode = "already_canceled"
    r = _webhook_post(_refund_event("evt_ref_ac"))
    assert r.status_code == 200
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "canceled"
    assert billing.is_subscribed(uid) is False


def test_webhook_charge_refunded_stripe_cancel_failure_returns_503():
    _, uid = _signed_in()
    _set_sub(uid, "active")
    _FakeSubscription.cancel_mode = "fail"
    r = _webhook_post(_refund_event("evt_ref_fail"))
    assert r.status_code == 503
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid).status == "active"  # nothing changed
    assert billing.is_subscribed(uid) is True


# ---------- GET /billing/price (single source of truth) ----------

class _FakePrice:
    retrieve_calls = []

    @staticmethod
    def retrieve(price_id):
        _FakePrice.retrieve_calls.append(price_id)
        return {"unit_amount": 1900, "currency": "usd", "recurring": {"interval": "month"}}


fake_stripe.Price = _FakePrice


def test_format_price_compact():
    assert billing._format_price(1900, "usd") == "$19"
    assert billing._format_price(999, "usd") == "$9.99"
    assert billing._format_price(1900, "eur") == "€19"
    assert billing._format_price(None, "usd") == ""


def test_price_falls_back_without_stripe_key():
    os.environ.pop("STRIPE_SECRET_KEY")
    r = client.get("/api/billing/price")
    assert r.status_code == 200
    body = r.json()
    assert body["configured"] is False
    assert body["display"] == "$19"  # page still renders a price


def test_price_reads_live_stripe_when_configured():
    r = client.get("/api/billing/price")
    assert r.status_code == 200
    body = r.json()
    assert body == {
        "configured": True,
        "unit_amount": 1900,
        "currency": "usd",
        "interval": "month",
        "display": "$19",
    }
    assert "price_fake" in _FakePrice.retrieve_calls


def test_price_is_public_no_auth():
    client.cookies.clear()
    assert client.get("/api/billing/price").status_code == 200
