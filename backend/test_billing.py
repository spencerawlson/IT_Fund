"""Tests for Stripe billing (backend/billing.py). Stripe is fully mocked — no network."""
import os
import sys
import types
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


def _set_sub(uid, status="active", customer="cus_test_1"):
    with db.SessionLocal() as s:
        s.merge(
            Subscription(
                user_id=uid,
                stripe_customer_id=customer,
                stripe_subscription_id="sub_test_1",
                status=status,
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


def test_status_503_without_key():
    cookies, _ = _signed_in()
    os.environ.pop("STRIPE_SECRET_KEY")
    assert client.get("/api/billing/status", cookies=cookies).status_code == 503


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
    monkeypatch.setenv("VENTORYN_SITE_ID", "site_road2cissp")
    cookies, uid = _signed_in()
    r = _checkout(cookies, attribution_tag="vtn_abc123.def456")
    assert r.status_code == 200
    assert _calls["checkout_create"]["metadata"] == {
        "user_id": uid,
        "ventoryn_site_id": "site_road2cissp",
        "ventoryn_tag": "vtn_abc123.def456",
    }
    with db.SessionLocal() as s:
        from db_models import User

        assert s.get(User, uid).attribution_tag == "vtn_abc123.def456"


def test_checkout_ignores_attribution_without_site_id_configured():
    # VENTORYN_SITE_ID is not set by default (setup_function only sets
    # Stripe keys) — attribution metadata must stay off, never partially
    # applied, but the tag is still recorded on the user's own row.
    cookies, uid = _signed_in()
    r = _checkout(cookies, attribution_tag="vtn_abc123.def456")
    assert r.status_code == 200
    assert _calls["checkout_create"]["metadata"] == {"user_id": uid}
    with db.SessionLocal() as s:
        from db_models import User

        assert s.get(User, uid).attribution_tag == "vtn_abc123.def456"


def test_checkout_rejects_malformed_attribution_tag(monkeypatch):
    monkeypatch.setenv("VENTORYN_SITE_ID", "site_road2cissp")
    cookies, uid = _signed_in()
    r = _checkout(cookies, attribution_tag="<script>alert(1)</script>")
    assert r.status_code == 200
    assert _calls["checkout_create"]["metadata"] == {"user_id": uid}
    with db.SessionLocal() as s:
        from db_models import User

        assert s.get(User, uid).attribution_tag is None


def test_checkout_attribution_is_first_touch_only(monkeypatch):
    monkeypatch.setenv("VENTORYN_SITE_ID", "site_road2cissp")
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
    assert _calls["checkout_create"]["metadata"] == {"user_id": uid}


def test_checkout_503_without_price():
    cookies, _ = _signed_in()
    os.environ.pop("STRIPE_PRICE_ID")
    r = client.post("/api/billing/checkout", cookies=cookies)
    assert r.status_code == 503
    assert "STRIPE_PRICE_ID" in r.json()["detail"]


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
