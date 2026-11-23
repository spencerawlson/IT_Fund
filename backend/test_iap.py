"""In-app purchases (StoreKit 2 direct): JWS verification, entitlement
grant/expiry, server notifications, the /iap/verify + /iap/notifications
endpoints, and the Apple/Stripe coexistence on one subscription row.

The JWS fixtures are real ES256 signatures over a locally-generated
three-certificate chain that mirrors Apple's shape (root -> intermediate
-> leaf, with the App Store OIDs on the intermediate and leaf). The
verifier is pointed at the test root via `trusted_root_der` — no network,
no real Apple secret, and a chain rooted anywhere else must fail.
"""
import base64
import datetime
import json
import os
import sys
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"  # allow the session cookie over http in tests

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID
from fastapi.testclient import TestClient
from joserfc import jws as joserfc_jws
from joserfc.jwk import ECKey

import db
import iap as iap_mod
import main
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session
from db_models import MembershipAllocation, ProcessedAppleNotification, Subscription, User

client = TestClient(main.app, base_url="https://testserver")

MONTHLY = "com.road2cissp.app.premium.monthly"
YEARLY = "com.road2cissp.app.premium.yearly"
NOW = datetime.datetime(2026, 11, 23, 12, 0, 0, tzinfo=datetime.timezone.utc)


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()


def _b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _cert_builder(subject_cn, issuer_name, public_key, *, ca, path_length=None):
    return (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject_cn)]))
        .issuer_name(issuer_name)
        .public_key(public_key)
        .serial_number(x509.random_serial_number())
        .not_valid_before(NOW - datetime.timedelta(days=1))
        .not_valid_after(NOW + datetime.timedelta(days=365))
        .add_extension(x509.BasicConstraints(ca=ca, path_length=path_length), critical=True)
    )


class TestChain:
    """A throwaway root -> intermediate -> leaf chain in Apple's shape.

    The root is P-384/SHA384 like Apple Root CA - G3; the intermediate
    carries OID 1.2.840.113635.100.6.2.1 and the leaf
    1.2.840.113635.100.6.11.1, the two OIDs Apple's server libraries check.
    `sign(payload)` returns a JWS with the chain in the x5c header.
    """

    def __init__(self):
        self.root_key = ec.generate_private_key(ec.SECP384R1())
        root_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Test Root CA - G3")])
        self.root_cert = (
            _cert_builder("Test Root CA - G3", root_name, self.root_key.public_key(), ca=True, path_length=1)
            .sign(self.root_key, hashes.SHA384())
        )
        self.root_der = self.root_cert.public_bytes(serialization.Encoding.DER)

        self.int_key = ec.generate_private_key(ec.SECP256R1())
        int_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Test Intermediate")])
        self.int_cert = (
            _cert_builder("Test Intermediate", root_name, self.int_key.public_key(), ca=True, path_length=0)
            .add_extension(
                x509.UnrecognizedExtension(
                    x509.ObjectIdentifier("1.2.840.113635.100.6.2.1"), b"\x05\x00"
                ),
                critical=False,
            )
            .sign(self.root_key, hashes.SHA384())
        )

        self.leaf_key = ec.generate_private_key(ec.SECP256R1())
        leaf_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Test Leaf")])
        self.leaf_cert = (
            _cert_builder("Test Leaf", int_name, self.leaf_key.public_key(), ca=False)
            .add_extension(
                x509.UnrecognizedExtension(
                    x509.ObjectIdentifier("1.2.840.113635.100.6.11.1"), b"\x05\x00"
                ),
                critical=False,
            )
            .sign(self.int_key, hashes.SHA256())
        )
        self.leaf_pem = self.leaf_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )

    def _x5c(self):
        return [
            _b64u(self.leaf_cert.public_bytes(serialization.Encoding.DER)),
            _b64u(self.int_cert.public_bytes(serialization.Encoding.DER)),
            _b64u(self.root_der),
        ]

    def sign(self, payload: dict, *, key=None, x5c=None, alg="ES256"):
        header = {"alg": alg, "x5c": self._x5c() if x5c is None else x5c}
        signing_key = key or ECKey.import_key(self.leaf_pem)
        return joserfc_jws.serialize_compact(header, json.dumps(payload).encode(), signing_key)


@pytest.fixture
def chain():
    return TestChain()


def _txn(*, product=MONTHLY, txn_id="1000000123456789", original="1000000123456789",
         expires=NOW + datetime.timedelta(days=30), purchased=NOW, revoked=None,
         bundle="com.road2cissp.app", env="Sandbox", type="Auto-Renewable Subscription"):
    payload = {
        "bundleId": bundle,
        "productId": product,
        "transactionId": txn_id,
        "originalTransactionId": original,
        "purchaseDate": int(purchased.timestamp() * 1000),
        "expiresDate": int(expires.timestamp() * 1000),
        "signedDate": int(NOW.timestamp() * 1000),
        "environment": env,
        "type": type,
    }
    if revoked is not None:
        payload["revocationDate"] = int(revoked.timestamp() * 1000)
        payload["revocationReason"] = 1
    return payload


def _signed_notification(chain, *, ntype="DID_RENEW", uuid="notif-1", txn=None, renewal=None, bundle="com.road2cissp.app"):
    data = {"bundleId": bundle, "environment": "Sandbox", "appAppleId": 1234567890}
    if txn is not None:
        data["signedTransactionInfo"] = chain.sign(txn)
    if renewal is not None:
        data["signedRenewalInfo"] = chain.sign(renewal)
    payload = {
        "notificationType": ntype,
        "notificationUUID": uuid,
        "signedDate": int(NOW.timestamp() * 1000),
        "data": data,
    }
    return chain.sign(payload)


def _signed_in(sub="u1", email="u1@example.com"):
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("google", sub, email, True, "U"))
        raw = create_session(s, user.id)
        s.commit()
        uid = user.id
    return {COOKIE_NAME: raw}, uid


def _row(uid):
    with db.SessionLocal() as s:
        return s.get(Subscription, uid)


def _aware_dt(value):
    """SQLite returns naive datetimes; treat them as UTC for comparisons."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=datetime.timezone.utc)
    return value


# ---------- JWS verification ----------


def test_verify_valid_transaction(chain):
    txn = _txn()
    decoded = iap_mod.verify_signed_transaction(
        chain.sign(txn), trusted_root_der=chain.root_der, now=NOW
    )
    assert decoded["productId"] == MONTHLY
    assert decoded["transactionId"] == "1000000123456789"


def test_verify_rejects_wrong_bundle_id(chain):
    txn = _txn(bundle="com.evil.app")
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(chain.sign(txn), trusted_root_der=chain.root_der, now=NOW)


def test_verify_rejects_unknown_product(chain):
    txn = _txn(product="com.road2cissp.app.premium.lifetime")
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(chain.sign(txn), trusted_root_der=chain.root_der, now=NOW)


def test_verify_rejects_non_subscription_type(chain):
    txn = _txn(type="Consumable")
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(chain.sign(txn), trusted_root_der=chain.root_der, now=NOW)


def test_verify_rejects_bad_signature(chain):
    # Signed with a different key than the leaf certificate carries.
    other_key = ec.generate_private_key(ec.SECP256R1())
    other_pem = other_key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    token = chain.sign(_txn(), key=ECKey.import_key(other_pem))
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(token, trusted_root_der=chain.root_der, now=NOW)


def test_verify_rejects_tampered_payload(chain):
    token = chain.sign(_txn())
    header_b64, payload_b64, sig_b64 = token.split(".")
    tampered_payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4)))
    tampered_payload["productId"] = YEARLY
    tampered_b64 = _b64u(json.dumps(tampered_payload).encode())
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(
            f"{header_b64}.{tampered_b64}.{sig_b64}", trusted_root_der=chain.root_der, now=NOW
        )


def test_verify_rejects_chain_rooted_elsewhere(chain):
    # Same shape, different root: the fingerprint pin must catch it.
    other = TestChain()
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(
            other.sign(_txn()), trusted_root_der=chain.root_der, now=NOW
        )


def test_verify_rejects_missing_x5c(chain):
    token = chain.sign(_txn(), x5c=[])
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(token, trusted_root_der=chain.root_der, now=NOW)


def test_verify_rejects_wrong_algorithm(chain):
    # A token whose header claims HS256 (re-encoded over a valid ES256
    # signature): the algorithm check must refuse it before any signature
    # work. Signing HS256 with the EC leaf key is not possible, so the
    # header is swapped instead.
    token = chain.sign(_txn())
    header_b64, payload_b64, sig_b64 = token.split(".")
    x5c = json.loads(base64.urlsafe_b64decode(header_b64 + "=" * (-len(header_b64) % 4)))["x5c"]
    bad_header_b64 = _b64u(json.dumps({"alg": "HS256", "x5c": x5c}).encode())
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(
            f"{bad_header_b64}.{payload_b64}.{sig_b64}",
            trusted_root_der=chain.root_der,
            now=NOW,
        )


def test_verify_rejects_expired_leaf_certificate(chain):
    # A leaf whose validity window ended before the transaction's signedDate.
    int_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Test Intermediate")])
    stale_leaf_key = ec.generate_private_key(ec.SECP256R1())
    stale_leaf = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Stale Leaf")]))
        .issuer_name(int_name)
        .public_key(stale_leaf_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(NOW - datetime.timedelta(days=30))
        .not_valid_after(NOW - datetime.timedelta(days=1))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.UnrecognizedExtension(
                x509.ObjectIdentifier("1.2.840.113635.100.6.11.1"), b"\x05\x00"
            ),
            critical=False,
        )
        .sign(chain.int_key, hashes.SHA256())
    )
    stale_pem = stale_leaf_key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    x5c = [
        _b64u(stale_leaf.public_bytes(serialization.Encoding.DER)),
        _b64u(chain.int_cert.public_bytes(serialization.Encoding.DER)),
        _b64u(chain.root_der),
    ]
    token = joserfc_jws.serialize_compact(
        {"alg": "ES256", "x5c": x5c},
        json.dumps(_txn()).encode(),
        ECKey.import_key(stale_pem),
    )
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_transaction(token, trusted_root_der=chain.root_der, now=NOW)


def test_bundled_apple_root_matches_published_fingerprint():
    der = (backend_dir / "iap_apple_root_ca_g3.cer").read_bytes()
    cert = x509.load_der_x509_certificate(der)
    assert cert.fingerprint(hashes.SHA256()).hex() == iap_mod.APPLE_ROOT_CA_G3_SHA256
    assert "Apple Root CA - G3" in cert.subject.rfc4514_string()


# ---------- entitlement grant / expiry ----------


def test_apply_grants_subscription_and_seat_source(chain):
    _, uid = _signed_in()
    status = iap_mod.apply_transaction(uid, _txn(), now=NOW)
    assert status["subscribed"] is True
    assert status["provider"] == "apple"
    assert status["plan"] == "monthly"
    row = _row(uid)
    assert row.status == "active"
    assert row.provider == "apple"
    assert row.stripe_customer_id is None
    assert row.apple_original_transaction_id == "1000000123456789"
    assert row.apple_product_id == MONTHLY
    assert _aware_dt(row.current_period_end) == NOW + datetime.timedelta(days=30)
    with db.SessionLocal() as s:
        alloc = s.query(MembershipAllocation).filter_by(user_id=uid).first()
    assert alloc is not None and alloc.source == "apple"


def test_apply_annual_maps_to_annual_plan(chain):
    _, uid = _signed_in()
    status = iap_mod.apply_transaction(uid, _txn(product=YEARLY), now=NOW)
    assert status["plan"] == "annual"


def test_apply_renewal_extends_period_end(chain):
    _, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(txn_id="1000000123456789"), now=NOW)
    status = iap_mod.apply_transaction(
        uid,
        _txn(
            txn_id="1000000123456790",
            purchased=NOW + datetime.timedelta(days=30),
            expires=NOW + datetime.timedelta(days=60),
        ),
        now=NOW + datetime.timedelta(days=30),
    )
    assert status["subscribed"] is True
    assert _aware_dt(_row(uid).current_period_end) == NOW + datetime.timedelta(days=60)


def test_apply_duplicate_delivery_is_idempotent(chain):
    _, uid = _signed_in()
    first = iap_mod.apply_transaction(uid, _txn(), now=NOW)
    second = iap_mod.apply_transaction(uid, _txn(), now=NOW)
    assert first == second
    assert _aware_dt(_row(uid).current_period_end) == NOW + datetime.timedelta(days=30)


def test_apply_stale_transaction_cannot_roll_the_row_back(chain):
    _, uid = _signed_in()
    iap_mod.apply_transaction(
        uid, _txn(txn_id="1000000123456790", expires=NOW + datetime.timedelta(days=60)), now=NOW
    )
    # An old transaction (earlier expiry) delivered late: ignored.
    status = iap_mod.apply_transaction(uid, _txn(txn_id="1000000123456789"), now=NOW)
    assert status["subscribed"] is True
    assert _aware_dt(_row(uid).current_period_end) == NOW + datetime.timedelta(days=60)
    assert _row(uid).apple_transaction_id == "1000000123456790"


def test_apply_expired_transaction_marks_expired(chain):
    _, uid = _signed_in()
    status = iap_mod.apply_transaction(
        uid, _txn(expires=NOW - datetime.timedelta(days=1)), now=NOW
    )
    assert status["subscribed"] is False
    assert _row(uid).status == "expired"


def test_apply_revoked_transaction_cancels(chain):
    _, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    assert _row(uid).status == "active"
    status = iap_mod.apply_transaction(
        uid, _txn(revoked=NOW + datetime.timedelta(days=5)), now=NOW
    )
    assert status["subscribed"] is False
    assert _row(uid).status == "canceled"
    assert _aware_dt(_row(uid).current_period_end) == NOW + datetime.timedelta(days=5)


def test_apply_grace_period_keeps_access_until_grace_expiry(chain):
    _, uid = _signed_in()
    status = iap_mod.apply_transaction(
        uid,
        _txn(expires=NOW - datetime.timedelta(days=1)),
        grace_expires=NOW + datetime.timedelta(days=6),
        now=NOW,
    )
    assert status["subscribed"] is True
    assert _row(uid).status == "active"
    assert _aware_dt(_row(uid).current_period_end) == NOW + datetime.timedelta(days=6)


def test_apply_refuses_unknown_or_deleted_user(chain):
    with pytest.raises(ValueError):
        iap_mod.apply_transaction("no-such-user", _txn(), now=NOW)


# ---------- server notifications ----------


def test_notification_renew_applies(chain):
    _, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    payload = iap_mod.verify_signed_notification(
        _signed_notification(
            chain,
            ntype="DID_RENEW",
            uuid="notif-renew-1",
            txn=_txn(
                txn_id="1000000123456790",
                purchased=NOW + datetime.timedelta(days=30),
                expires=NOW + datetime.timedelta(days=60),
            ),
        ),
        trusted_root_der=chain.root_der,
        now=NOW,
    )
    result = iap_mod.handle_notification(payload, now=NOW + datetime.timedelta(days=30), trusted_root_der=chain.root_der)
    assert result["processed"] is True
    assert result["user_id"] == uid
    assert _aware_dt(_row(uid).current_period_end) == NOW + datetime.timedelta(days=60)


def test_notification_refund_cancels(chain):
    _, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    payload = iap_mod.verify_signed_notification(
        _signed_notification(
            chain,
            ntype="REFUND",
            uuid="notif-refund-1",
            txn=_txn(revoked=NOW + datetime.timedelta(days=2)),
        ),
        trusted_root_der=chain.root_der,
        now=NOW,
    )
    iap_mod.handle_notification(payload, now=NOW, trusted_root_der=chain.root_der)
    assert _row(uid).status == "canceled"


def test_notification_expire_marks_expired(chain):
    _, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    payload = iap_mod.verify_signed_notification(
        _signed_notification(
            chain,
            ntype="DID_EXPIRE",
            uuid="notif-expire-1",
            txn=_txn(expires=NOW + datetime.timedelta(days=30)),
        ),
        trusted_root_der=chain.root_der,
        now=NOW,
    )
    iap_mod.handle_notification(
        payload, now=NOW + datetime.timedelta(days=31), trusted_root_der=chain.root_der
    )
    assert _row(uid).status == "expired"


def test_notification_grace_period_keeps_access(chain):
    _, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    # The paid period ended at NOW+30; Apple is retrying payment and the
    # grace period runs until NOW+36. Handled at NOW+31, access must hold.
    renewal = {
        "gracePeriodExpiresDate": int((NOW + datetime.timedelta(days=36)).timestamp() * 1000),
        "signedDate": int(NOW.timestamp() * 1000),
    }
    payload = iap_mod.verify_signed_notification(
        _signed_notification(
            chain,
            ntype="DID_CHANGE_RENEWAL_STATUS",
            uuid="notif-grace-1",
            txn=_txn(expires=NOW + datetime.timedelta(days=30)),
            renewal=renewal,
        ),
        trusted_root_der=chain.root_der,
        now=NOW,
    )
    iap_mod.handle_notification(
        payload, now=NOW + datetime.timedelta(days=31), trusted_root_der=chain.root_der
    )
    row = _row(uid)
    assert row.status == "active"
    assert _aware_dt(row.current_period_end) == NOW + datetime.timedelta(days=36)


def test_notification_duplicate_uuid_is_acknowledged_once(chain):
    _, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    signed = _signed_notification(
        chain,
        ntype="DID_RENEW",
        uuid="notif-dup-1",
        txn=_txn(
            txn_id="1000000123456790",
            purchased=NOW + datetime.timedelta(days=30),
            expires=NOW + datetime.timedelta(days=60),
        ),
    )
    payload = iap_mod.verify_signed_notification(
        signed, trusted_root_der=chain.root_der, now=NOW
    )
    first = iap_mod.handle_notification(payload, now=NOW + datetime.timedelta(days=30), trusted_root_der=chain.root_der)
    second = iap_mod.handle_notification(payload, now=NOW + datetime.timedelta(days=30), trusted_root_der=chain.root_der)
    assert first["processed"] is True
    assert second["processed"] is False
    assert second["reason"] == "duplicate"
    with db.SessionLocal() as s:
        rows = s.query(ProcessedAppleNotification).filter_by(notification_uuid="notif-dup-1").all()
    assert len(rows) == 1


def test_notification_unknown_type_is_recorded_and_acked(chain):
    _, uid = _signed_in()
    payload = iap_mod.verify_signed_notification(
        _signed_notification(chain, ntype="SOME_FUTURE_TYPE", uuid="notif-future-1"),
        trusted_root_der=chain.root_der,
        now=NOW,
    )
    result = iap_mod.handle_notification(payload, now=NOW, trusted_root_der=chain.root_der)
    assert result["processed"] is True
    with db.SessionLocal() as s:
        row = s.get(ProcessedAppleNotification, "notif-future-1")
    assert row is not None and row.notification_type == "SOME_FUTURE_TYPE"


def test_notification_unknown_original_transaction_is_recorded_not_granted(chain):
    payload = iap_mod.verify_signed_notification(
        _signed_notification(chain, ntype="DID_RENEW", uuid="notif-orphan-1", txn=_txn()),
        trusted_root_der=chain.root_der,
        now=NOW,
    )
    result = iap_mod.handle_notification(payload, now=NOW, trusted_root_der=chain.root_der)
    assert result["processed"] is True
    assert result["user_id"] is None
    with db.SessionLocal() as s:
        assert s.query(Subscription).count() == 0


def test_notification_test_type_is_acked(chain):
    payload = iap_mod.verify_signed_notification(
        _signed_notification(chain, ntype="TEST", uuid="notif-test-1"),
        trusted_root_der=chain.root_der,
        now=NOW,
    )
    result = iap_mod.handle_notification(payload, now=NOW, trusted_root_der=chain.root_der)
    assert result["processed"] is True


def test_notification_rejects_wrong_bundle(chain):
    signed = _signed_notification(chain, ntype="DID_RENEW", uuid="notif-bad-1", txn=_txn(), bundle="com.evil.app")
    with pytest.raises(iap_mod.IapVerificationError):
        iap_mod.verify_signed_notification(signed, trusted_root_der=chain.root_der, now=NOW)


# ---------- HTTP routes ----------


def test_verify_endpoint_requires_auth(chain):
    res = client.post("/api/iap/verify", json={"signed_transaction": chain.sign(_txn())})
    assert res.status_code == 401


def test_verify_endpoint_refuses_non_apple_chain(chain):
    cookies, uid = _signed_in()
    res = client.post(
        "/api/iap/verify",
        json={"signed_transaction": chain.sign(_txn())},
        cookies=cookies,
    )
    # The test chain roots at a test CA, not Apple's — the production
    # endpoint must refuse it. The grant path is covered by apply_transaction
    # above; this asserts the route refuses an unverifiable JWS.
    assert res.status_code == 400
    assert _row(uid) is None


def test_verify_endpoint_rejects_garbage():
    cookies, _uid = _signed_in()
    res = client.post("/api/iap/verify", json={"signed_transaction": "not-a-jws"}, cookies=cookies)
    assert res.status_code == 400


def test_notifications_endpoint_requires_signed_payload():
    res = client.post("/api/iap/notifications", json={})
    assert res.status_code == 400
    res = client.post("/api/iap/notifications", json={"signedPayload": "garbage"})
    assert res.status_code == 400


def test_notifications_endpoint_rejects_non_json():
    res = client.post("/api/iap/notifications", content="not json", headers={"Content-Type": "application/json"})
    assert res.status_code == 400


# ---------- coexistence with Stripe + status endpoint ----------


def test_status_endpoint_reports_apple_provider_and_plan(chain):
    cookies, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    res = client.get("/api/billing/status", cookies=cookies)
    assert res.status_code == 200
    data = res.json()
    assert data["subscribed"] is True
    assert data["provider"] == "apple"
    assert data["plan"] == "monthly"
    assert data["status"] == "active"


def test_status_endpoint_reports_stripe_provider():
    cookies, uid = _signed_in()
    with db.SessionLocal() as s:
        s.merge(
            Subscription(
                user_id=uid,
                stripe_customer_id="cus_test_1",
                stripe_subscription_id="sub_test_1",
                status="active",
                provider="stripe",
                current_period_end=NOW + datetime.timedelta(days=30),
            )
        )
        s.commit()
    res = client.get("/api/billing/status", cookies=cookies)
    assert res.json()["provider"] == "stripe"
    assert res.json()["plan"] is None


def test_stripe_webhook_sync_flips_provider_back_to_stripe(chain):
    # An Apple subscriber who later buys on the web: the Stripe webhook is
    # the latest writer, and the Apple fields survive for the record.
    import billing

    _, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    billing._sync_from_subscription(
        uid,
        {
            "id": "sub_test_1",
            "customer": "cus_test_1",
            "status": "active",
            "current_period_start": int(NOW.timestamp()),
            "current_period_end": int((NOW + datetime.timedelta(days=30)).timestamp()),
            "metadata": {},
        },
    )
    row = _row(uid)
    assert row.provider == "stripe"
    assert row.stripe_customer_id == "cus_test_1"
    assert row.apple_product_id == MONTHLY  # Apple history is not wiped


def test_account_deletion_cancels_apple_row_without_resurrection(chain):
    cookies, uid = _signed_in()
    iap_mod.apply_transaction(uid, _txn(), now=NOW)
    res = client.request("DELETE", "/api/account", json={"confirm": True}, cookies=cookies)
    assert res.status_code == 200
    row = _row(uid)
    assert row.status == "canceled"
    with db.SessionLocal() as s:
        user = s.get(User, uid)
    assert user.deleted_at is not None
    # Re-applying the same Apple transaction to the deleted account refuses.
    with pytest.raises(ValueError):
        iap_mod.apply_transaction(uid, _txn(), now=NOW)
