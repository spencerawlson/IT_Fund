"""Founding-membership capacity (enrollment.py) — admin platform step 1.

Covers the spec's rules: one place per eligible member; a renewal, a
duplicate webhook or a retried checkout never takes a second place; a failed
payment takes none; a cancellation keeps the place until paid access ends;
an ended membership frees it; complimentary places never count against the
paid capacity; the owner holds none; the capacity cannot be oversold; and
the public counter reads only these server-side rows.

The Postgres race test at the bottom runs only when ENROLLMENT_PG_URL points
at a Postgres database (the CI migrations job sets it); SQLite has no
row-level locks to exercise.
"""
import os
import sys
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

import admin as admin_mod
import billing
import db
import enrollment
import main
from db_models import AdminAuditLog, ManualGrant, MembershipAllocation, Subscription, User

client = TestClient(main.app)
import admin_testkit
FUTURE = int(datetime(2030, 1, 1, tzinfo=timezone.utc).timestamp())


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    os.environ.pop("BILLING_OWNER_EMAILS", None)
    admin_mod._admin_login_attempts.clear()


def teardown_function():
    os.environ.pop("BILLING_OWNER_EMAILS", None)
    admin_testkit.clear(client)


def _user(uid, email=None):
    with db.SessionLocal() as s:
        s.add(User(id=uid, display_name=uid, email=email or f"{uid}@example.com"))
        s.commit()
    return uid


def _sub(uid, status="active", period_end=FUTURE, sub_id=None):
    return {
        "id": sub_id or f"sub_{uid}",
        "customer": f"cus_{uid}",
        "status": status,
        "current_period_end": period_end,
        "metadata": {"user_id": uid},
    }


def _sync(uid, **kw):
    billing._sync_from_subscription(uid, _sub(uid, **kw), datetime.now(timezone.utc))


def _open(uid):
    with db.SessionLocal() as s:
        return s.query(MembershipAllocation).filter(
            MembershipAllocation.user_id == uid, MembershipAllocation.status != "released"
        ).one_or_none()


def _rows(uid):
    with db.SessionLocal() as s:
        return s.query(MembershipAllocation).filter(MembershipAllocation.user_id == uid).all()


def _capacity(paid=None, comp=None):
    enrollment.update_settings(paid_capacity=paid, comp_capacity=comp)


def _login():
    admin_testkit.admin_login(client)


# ---------- online subscriptions (Stripe webhook) ----------

def test_online_subscription_takes_exactly_one_place():
    _user("u1")
    _sync("u1")
    alloc = _open("u1")
    assert alloc.status == "active" and alloc.kind == "paid" and alloc.source == "stripe"
    assert enrollment.public_availability() == {"capacity": 10000, "available": 9999, "taken": 1}


def test_renewal_and_duplicate_webhook_never_take_a_second_place():
    _user("u1")
    _sync("u1")
    _sync("u1")  # duplicate delivery
    _sync("u1", period_end=FUTURE + 30 * 86400)  # renewal: the period moves on
    assert len(_rows("u1")) == 1
    assert enrollment.summary()["paid_occupied"] == 1


def test_failed_first_payment_takes_no_place():
    _user("u1")
    _sync("u1", status="incomplete")
    assert _open("u1") is None
    assert enrollment.summary()["paid_occupied"] == 0


def test_past_due_keeps_the_place_during_the_grace_then_frees_it():
    _user("u1")
    _sync("u1")
    _sync("u1", status="past_due")  # inside the 7-day grace: still has access
    assert _open("u1").status == "active"
    with db.SessionLocal() as s:  # the grace runs out
        row = s.get(Subscription, "u1")
        row.past_due_since = datetime.now(timezone.utc) - timedelta(days=8)
        s.commit()
    enrollment.reconcile()
    assert _open("u1") is None


def test_cancellation_keeps_the_place_until_paid_access_ends():
    _user("u1")
    _sync("u1")
    # Cancel at period end: Stripe keeps status active until the period ends.
    _sync("u1", status="active")
    assert _open("u1") is not None
    # The period ends: Stripe sends customer.subscription.deleted (canceled).
    _sync("u1", status="canceled", period_end=int(datetime.now(timezone.utc).timestamp()) - 3600)
    assert _open("u1") is None
    rows = _rows("u1")
    assert len(rows) == 1 and rows[0].status == "released"  # history kept, never deleted
    assert enrollment.summary()["paid_available"] == 10000  # the place went back to the pool


def test_resubscribing_after_the_place_was_freed_takes_a_new_place():
    _user("u1")
    _sync("u1")
    _sync("u1", status="canceled", period_end=1)
    _sync("u1", sub_id="sub_second")
    assert len(_rows("u1")) == 2 and _open("u1").status == "active"
    assert enrollment.summary()["paid_occupied"] == 1


def test_owner_never_holds_a_place():
    os.environ["BILLING_OWNER_EMAILS"] = "owner@example.com"
    _user("own", "owner@example.com")
    _sync("own")
    assert _open("own") is None


# ---------- checkout reservations and capacity ----------

def test_checkout_reservation_holds_a_place_and_the_webhook_activates_it():
    _user("u1")
    enrollment.reserve("u1")
    assert enrollment.summary()["paid_reserved"] == 1
    enrollment.reserve("u1")  # retried checkout: same place
    assert len(_rows("u1")) == 1
    _sync("u1")
    alloc = _open("u1")
    assert alloc.status == "active" and alloc.reserved_until is None
    assert len(_rows("u1")) == 1 and enrollment.summary()["paid_occupied"] == 1


def test_capacity_exhaustion_refuses_new_checkouts():
    _capacity(paid=2)
    for uid in ("a", "b", "c"):
        _user(uid)
    enrollment.reserve("a")
    _sync("b")
    with pytest.raises(enrollment.CapacityFull):
        enrollment.reserve("c")
    assert enrollment.public_availability()["available"] == 0


def test_a_lapsed_reservation_frees_its_place():
    _capacity(paid=1)
    _user("a")
    _user("b")
    enrollment.reserve("a")
    with db.SessionLocal() as s:
        alloc = s.query(MembershipAllocation).filter_by(user_id="a").one()
        alloc.reserved_until = datetime.now(timezone.utc) - timedelta(minutes=1)
        s.commit()
    assert enrollment.public_availability()["available"] == 1  # lapsed: not counted
    enrollment.reserve("b")  # so b can take it
    report = enrollment.reconcile()
    assert report["reservations_expired"] == 1
    assert _open("a") is None and _open("b").status == "reserved"


def test_payment_after_a_lapsed_reservation_with_no_place_left_keeps_access_flagged():
    _capacity(paid=1)
    _user("a")
    _user("b")
    _sync("a")
    _sync("b")  # b paid (its reservation had lapsed and the place went to a)
    alloc = _open("b")
    assert alloc.status == "active" and alloc.over_capacity is True
    assert billing.is_subscribed("b")  # paid access is never withheld
    assert enrollment.summary()["over_capacity"] == 1


def test_the_database_refuses_a_second_open_place_for_one_user():
    _user("u1")
    _sync("u1")
    with db.SessionLocal() as s:
        s.add(MembershipAllocation(user_id="u1", kind="paid", source="manual", status="active"))
        with pytest.raises(IntegrityError):
            s.commit()


# ---------- manual enrollment (admin) ----------

def test_manual_enrollment_takes_a_place_and_revoking_frees_it():
    _login()
    r = client.post("/api/admin/accounts", json={"display_name": "In Person", "email": "walkin@example.com"})
    assert r.status_code == 201
    uid = r.json()["user"]["id"]
    alloc = _open(uid)
    assert alloc.source == "manual" and alloc.kind == "paid"
    r = client.post(f"/api/admin/accounts/{uid}/manual-grant/revoke", json={"note": "left"})
    assert r.status_code == 200
    assert _open(uid) is None
    with db.SessionLocal() as s:
        rows = s.query(AdminAuditLog).order_by(AdminAuditLog.created_at).all()
    changes = [a for a in rows if not a.action.startswith("admin.")]  # skip the sign-in itself
    assert [a.action for a in changes] == ["account.add_with_grant", "grant.revoke"]
    admin_id = rows[0].actor
    assert admin_id not in ("admin", None)  # the admin's own account, not a shared actor
    assert all(a.actor == admin_id for a in changes)


def test_manual_enrollment_is_refused_when_full():
    _capacity(paid=1)
    _user("a")
    _sync("a")
    _login()
    r = client.post("/api/admin/accounts", json={"display_name": "Late", "email": "late@example.com"})
    assert r.status_code == 409
    with db.SessionLocal() as s:  # nothing half-created
        assert s.query(User).filter(User.email == "late@example.com").count() == 0


def test_granting_a_stripe_subscriber_does_not_take_a_second_place_even_when_full():
    _capacity(paid=1)
    _user("a")
    _sync("a")
    _login()
    r = client.post("/api/admin/accounts/a/manual-grant", json={"note": "paid cash too"})
    assert r.status_code == 201
    assert len(_rows("a")) == 1


def test_revoking_a_grant_keeps_the_place_of_a_stripe_subscriber():
    _user("a")
    _sync("a")
    _login()
    client.post("/api/admin/accounts/a/manual-grant", json={})
    client.post("/api/admin/accounts/a/manual-grant/revoke", json={})
    alloc = _open("a")
    assert alloc is not None and alloc.source == "stripe"


def test_deleting_an_account_frees_its_place():
    _login()
    uid = client.post("/api/admin/accounts", json={"display_name": "X", "email": "x@example.com"}).json()["user"]["id"]
    assert client.delete(f"/api/admin/accounts/{uid}").status_code == 200
    assert _open(uid) is None


# ---------- complimentary places ----------

def test_complimentary_places_never_count_against_paid_capacity():
    _capacity(paid=1, comp=2)
    _user("c1")
    enrollment.activate("c1", enrollment.COMPLIMENTARY, "manual")
    assert enrollment.public_availability() == {"capacity": 1, "available": 1, "taken": 0}
    summary = enrollment.summary()
    assert summary["comp_active"] == 1 and summary["comp_available"] == 1
    _user("c2")
    _user("c3")
    enrollment.activate("c2", enrollment.COMPLIMENTARY, "manual")
    with pytest.raises(enrollment.CapacityFull):
        enrollment.activate("c3", enrollment.COMPLIMENTARY, "manual")


# ---------- reconcile (existing subscribers, missed webhooks) ----------

def test_reconcile_gives_existing_members_their_places_once():
    for uid in ("a", "b", "c"):
        _user(uid)
    with db.SessionLocal() as s:  # rows from before capacity existed
        s.add(Subscription(user_id="a", stripe_customer_id="cus_a", status="active",
                           current_period_end=datetime(2030, 1, 1, tzinfo=timezone.utc)))
        s.add(Subscription(user_id="b", stripe_customer_id="cus_b", status="canceled"))
        s.add(ManualGrant(user_id="c", note="cash"))
        s.commit()
    report = enrollment.reconcile()
    assert report["activated"] == 2
    assert _open("a").source == "stripe" and _open("c").source == "manual" and _open("b") is None
    assert enrollment.reconcile() == {"activated": 0, "released": 0, "reservations_expired": 0}


def test_reconcile_never_withholds_access_from_existing_members_over_capacity():
    _capacity(paid=0)
    _user("a")
    with db.SessionLocal() as s:
        s.add(ManualGrant(user_id="a", note="cash"))
        s.commit()
    enrollment.reconcile()
    assert _open("a").over_capacity is True and billing.is_subscribed("a")


# ---------- settings, admin API, public counter ----------

def test_capacity_cannot_go_below_the_places_taken_or_be_invalid():
    for uid in ("a", "b"):
        _user(uid)
        _sync(uid)
    with pytest.raises(ValueError):
        enrollment.update_settings(paid_capacity=1)
    for bad in (-1, 1.5, "100", True, enrollment.MAX_CAPACITY + 1):
        with pytest.raises(ValueError):
            enrollment.update_settings(paid_capacity=bad)
    enrollment.update_settings(paid_capacity=2)
    assert enrollment.public_availability()["available"] == 0


def test_admin_enrollment_endpoints_require_admin_and_are_audited():
    assert client.get("/api/admin/enrollment").status_code == 401
    assert client.put("/api/admin/enrollment/settings", json={"paid_capacity": 5}).status_code == 401
    assert client.post("/api/admin/enrollment/reconcile").status_code == 401
    _login()
    r = client.put("/api/admin/enrollment/settings", json={"paid_capacity": 12000, "comp_capacity": 50})
    assert r.status_code == 200
    assert r.json()["enrollment"]["paid_capacity"] == 12000
    r = client.put("/api/admin/enrollment/settings", json={"paid_capacity": "lots"})
    assert r.status_code == 400
    assert client.post("/api/admin/enrollment/reconcile").status_code == 200
    data = client.get("/api/admin/enrollment").json()
    assert data["enrollment"]["comp_capacity"] == 50
    actions = [a["action"] for a in data["recent_activity"]]
    assert actions[:3] == ["enrollment.reconcile", "enrollment.settings", "admin.mfa_enrolled"]
    settings_entry = data["recent_activity"][1]
    assert settings_entry["details"] == {
        "before": {"paid_capacity": 10000, "comp_capacity": 100},
        "after": {"paid_capacity": 12000, "comp_capacity": 50},
    }


def test_public_counter_matches_the_admin_numbers_and_needs_no_auth():
    _user("a")
    _sync("a")
    pub = client.get("/api/public/enrollment").json()
    _login()
    adm = client.get("/api/admin/enrollment").json()["enrollment"]
    assert pub == {"capacity": adm["paid_capacity"], "available": adm["paid_available"], "taken": adm["paid_occupied"]}
    assert pub["available"] == 9999


def test_public_counter_withholds_numbers_when_the_database_fails(monkeypatch):
    def boom():
        raise RuntimeError("db down")
    monkeypatch.setattr(enrollment, "summary", boom)
    assert client.get("/api/public/enrollment").json() == {"capacity": None, "available": None, "taken": None}


# ---------- concurrency (Postgres only) ----------

PG_URL = os.environ.get("ENROLLMENT_PG_URL")


@pytest.mark.skipif(not PG_URL, reason="needs ENROLLMENT_PG_URL (a Postgres database)")
def test_simultaneous_checkouts_never_oversell_on_postgres():
    db.configure(PG_URL)
    db.Base.metadata.drop_all(db.engine)
    db.init_db()
    try:
        _capacity(paid=5)
        users = [_user(f"race{i}") for i in range(25)]
        won, refused, errors = [], [], []
        barrier = threading.Barrier(len(users))

        def go(uid):
            barrier.wait()
            try:
                enrollment.reserve(uid)
                won.append(uid)
            except enrollment.CapacityFull:
                refused.append(uid)
            except Exception as exc:  # pragma: no cover - surfaced below
                errors.append(repr(exc))

        threads = [threading.Thread(target=go, args=(u,)) for u in users]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert not errors, errors
        assert len(won) == 5 and len(refused) == 20
        assert enrollment.summary()["paid_occupied"] == 5
    finally:
        db.Base.metadata.drop_all(db.engine)
        db.configure("sqlite+pysqlite:///:memory:")
