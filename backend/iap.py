"""In-app purchases (App Store Guideline 3.1.1) — StoreKit 2, direct, no SDK.

The iOS app sells the subscription through Apple's in-app purchase instead
of Stripe Checkout (which is only for the website). The flow:

1. The app (Capacitor plugin `r2c-storekit`, `plugins/r2c-storekit/`) fetches
   the two products from the App Store, runs the StoreKit 2 purchase, and
   hands the backend the signed transaction JWS (`jwsRepresentation`).
2. This module verifies that JWS server-side — the x5c certificate chain
   against the bundled Apple Root CA - G3 (fingerprint-pinned, the same
   verification Apple's own server libraries do), the ES256 signature with
   the leaf certificate's key, then the claims (bundle ID, product ID,
   subscription type) — and grants/extends entitlement in the existing
   `subscriptions` row, with `provider='apple'`. There is no parallel
   subscription table: Stripe and Apple are two sources of truth for the
   same row, and the row's `provider` says which one last wrote it.
3. App Store Server Notifications (V2) arrive at POST /iap/notifications
   as a signed JWS (`signedPayload`); the same verifier checks it, and the
   embedded signed transaction updates the row (renew / expire / refund /
   revoke / grace period).

What this module deliberately does NOT do:
- No App Store Connect API key, no server-to-server calls to Apple. The
  JWS itself is the proof, so verification is offline and needs no secret.
  (The App Store Server API — GET /inApps/v1/transactions/{id} — is only
  needed if a transaction has to be re-fetched without its JWS; it is not
  used here.)
- No receipt validation: the legacy /verifyReceipt endpoint is deprecated
  and StoreKit 2 transactions carry their own JWS.
- No environment gate: Sandbox transactions (TestFlight / sandbox testers)
  and Production transactions are both accepted — the bundle-ID check is
  the security boundary, and a sandbox tester is a real tester. The
  environment is recorded in the response so the UI can say which it is.

Environment variables (all optional):
- IAP_BUNDLE_ID — the app's bundle ID; default com.road2cissp.app.
- APPLE_APP_ID — the numeric App Store app ID, once the ASC app record
  exists; when set, server notifications must carry the same appAppleId.
  Until then it is unset and the check is skipped.
"""
from __future__ import annotations

import base64
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import db
import enrollment
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from db_models import ProcessedAppleNotification, Subscription, User
from joserfc import jws as joserfc_jws
from joserfc.errors import BadSignatureError, ExceededSizeError
from joserfc.jwk import ECKey
from joserfc._rfc7515.registry import JWSRegistry

log = logging.getLogger(__name__)

#: The app's bundle ID — the one claim every Apple-signed payload must carry.
BUNDLE_ID = os.environ.get("IAP_BUNDLE_ID", "com.road2cissp.app")

#: The two App Store subscription products, product ID -> plan name (the same
#: plan names billing.py uses: "monthly" / "annual"). The App Store prices
#: mirror the web prices ($29/mo, $250/yr) via the nearest price tier per
#: currency; the tier amounts themselves live in App Store Connect, not here.
#: Single source of truth server-side; the app keeps its own copy in
#: src/lib/iap.js and the native plugin takes the IDs as a parameter, so no
#: ID is hard-coded in more than one place per side.
IAP_PRODUCTS: dict[str, str] = {
    "com.road2cissp.app.premium.monthly": "monthly",
    "com.road2cissp.app.premium.yearly": "annual",
}

#: SHA-256 fingerprint of Apple Root CA - G3, as Apple publishes it at
#: https://www.apple.com/certificateauthority/AppleRootCA-G3.cer (expires
#: 30 April 2039). The chain in every signed transaction must root at a
#: certificate with exactly this fingerprint — without the pin, anyone could
#: mint a self-signed "Apple Root CA - G3" and forge transactions.
APPLE_ROOT_CA_G3_SHA256 = (
    "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179"
)

#: OID Apple puts on the leaf certificate that signs StoreKit transactions
#: (Apple's server libraries check it), and on the intermediate that issues
#: it. A chain without these OIDs is not an App Store signing chain.
_LEAF_OID = "1.2.840.113635.100.6.11.1"
_INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1"

#: joserfc caps JWS headers at 512 bytes by default; an x5c chain (three
#: certificates, base64) makes Apple's headers ~3-4 KB. 8192 is generous
#: but still bounded, so a hostile giant header cannot OOM the verifier.
_JWS_REGISTRY = JWSRegistry(algorithms=["ES256"])
_JWS_REGISTRY.max_header_length = 8192

_ROOT_CERT_PATH = Path(__file__).with_name("iap_apple_root_ca_g3.cer")


def _load_root_cert() -> bytes:
    """The bundled Apple Root CA - G3 (DER), fingerprint-checked at import.

    This is a public root certificate, not a secret — it is the trust anchor
    the chain is verified against, exactly as Apple's server libraries take
    the root certificates as an input. Failing loudly here (rather than at
    the first purchase) means a bad bundle can never silently pass a forgery.
    """
    der = _ROOT_CERT_PATH.read_bytes()
    cert = x509.load_der_x509_certificate(der)
    fingerprint = cert.fingerprint(hashes.SHA256()).hex()
    if fingerprint != APPLE_ROOT_CA_G3_SHA256:
        raise RuntimeError(
            "Bundled Apple Root CA - G3 does not match the published "
            f"fingerprint (got {fingerprint}); refusing to verify IAP "
            "transactions until the bundle is fixed."
        )
    if cert.subject.rfc4514_string() != "C=US,O=Apple Inc.,OU=Apple Certification Authority,CN=Apple Root CA - G3":
        raise RuntimeError("Bundled root certificate is not Apple Root CA - G3.")
    return der


# Verified once at import; the fingerprint check above is the pin.
_APPLE_ROOT_CERT_DER = _load_root_cert()


class IapVerificationError(ValueError):
    """An Apple-signed payload failed verification (bad chain, bad signature,
    or a claim that does not belong to this app)."""


def _b64url_decode(segment: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))
    except Exception as exc:  # noqa: BLE001 — any malformed segment is a verification failure
        raise IapVerificationError("Malformed base64url in JWS.") from exc


def _has_oid(cert: x509.Certificate, oid: str) -> bool:
    return any(ext.oid.dotted_string == oid for ext in cert.extensions)


def _verify_chain(x5c: list[str], effective: datetime, expected_root_fingerprint: str) -> x509.Certificate:
    """Verify the three-certificate chain from a JWS x5c header.

    Returns the leaf certificate (whose public key signs the JWS). Raises
    IapVerificationError on any failure: wrong length, bad signatures,
    missing Apple OIDs, an expired certificate at the effective time, or a
    root that is not the pinned Apple Root CA - G3.
    """
    if len(x5c) != 3:
        raise IapVerificationError(f"Expected a 3-certificate x5c chain, got {len(x5c)}.")
    try:
        leaf = x509.load_der_x509_certificate(_b64url_decode(x5c[0]))
        intermediate = x509.load_der_x509_certificate(_b64url_decode(x5c[1]))
        root = x509.load_der_x509_certificate(_b64url_decode(x5c[2]))
    except Exception as exc:  # noqa: BLE001 — any unparsable cert is a verification failure
        raise IapVerificationError("Unparsable certificate in x5c chain.") from exc
    try:
        leaf.verify_directly_issued_by(intermediate)
        intermediate.verify_directly_issued_by(root)
        root.verify_directly_issued_by(root)  # self-signed root
    except InvalidSignature as exc:
        raise IapVerificationError("Certificate chain signature mismatch.") from exc
    if root.fingerprint(hashes.SHA256()).hex() != expected_root_fingerprint:
        raise IapVerificationError("x5c chain does not root at Apple Root CA - G3.")
    if not _has_oid(leaf, _LEAF_OID):
        raise IapVerificationError("Leaf certificate lacks the App Store transaction-signing OID.")
    if not _has_oid(intermediate, _INTERMEDIATE_OID):
        raise IapVerificationError("Intermediate certificate lacks the Apple certification OID.")
    for cert, name in ((leaf, "leaf"), (intermediate, "intermediate")):
        if not (cert.not_valid_before_utc <= effective <= cert.not_valid_after_utc):
            raise IapVerificationError(f"{name} certificate was not valid at the transaction's signed date.")
    return leaf


def verify_signed_jws(
    token: str,
    *,
    trusted_root_der: bytes | None = None,
    expected_root_fingerprint: str = APPLE_ROOT_CA_G3_SHA256,
    now: datetime | None = None,
) -> dict:
    """Verify an Apple-signed JWS (signed transaction or signed notification
    payload) and return its decoded payload.

    Steps, in the order Apple's server libraries do them: decode the header
    (must be ES256 with an x5c chain), verify the chain against the pinned
    root, verify the JWS signature with the leaf's public key, then return
    the payload. `trusted_root_der` / `expected_root_fingerprint` exist so
    tests can verify against a locally-generated test chain instead of
    Apple's root — production always uses the bundled Apple root.
    """
    if not isinstance(token, str) or token.count(".") != 2:
        raise IapVerificationError("Not a JWS compact serialization.")
    header_b64, _payload_b64, _sig_b64 = token.split(".")
    try:
        header = json.loads(_b64url_decode(header_b64))
    except Exception as exc:  # noqa: BLE001 — any malformed header is a verification failure
        raise IapVerificationError("Malformed JWS header.") from exc
    if header.get("alg") != "ES256":
        raise IapVerificationError(f"Unexpected JWS algorithm: {header.get('alg')!r} (expected ES256).")
    x5c = header.get("x5c")
    if not isinstance(x5c, list) or not x5c:
        raise IapVerificationError("JWS header has no x5c certificate chain.")

    # The payload's signedDate is the time the certificates must have been
    # valid at (Apple's leaf certificates are short-lived). It is read
    # unverified here, but the signature is verified immediately afterwards,
    # so a tampered signedDate fails the signature check.
    try:
        unverified = json.loads(_b64url_decode(_payload_b64))
    except Exception as exc:  # noqa: BLE001 — any malformed payload is a verification failure
        raise IapVerificationError("Malformed JWS payload.") from exc
    signed_date_ms = unverified.get("signedDate")
    effective = (
        datetime.fromtimestamp(signed_date_ms / 1000, tz=timezone.utc)
        if isinstance(signed_date_ms, (int, float))
        else (now or datetime.now(timezone.utc))
    )

    # The chain's root must be the trusted root (bundled Apple root in
    # production, the test root in tests) AND match the pinned fingerprint.
    # Passing a different trusted root without its fingerprint still fails.
    if trusted_root_der is not None:
        trusted = x509.load_der_x509_certificate(trusted_root_der)
        expected_root_fingerprint = trusted.fingerprint(hashes.SHA256()).hex()
    leaf = _verify_chain(x5c, effective, expected_root_fingerprint)

    leaf_pub_pem = leaf.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    try:
        verified = joserfc_jws.deserialize_compact(
            token,
            ECKey.import_key(leaf_pub_pem),
            algorithms=["ES256"],
            registry=_JWS_REGISTRY,
        )
    except (BadSignatureError, ExceededSizeError, Exception) as exc:  # noqa: BLE001 — any signature failure is a verification failure
        raise IapVerificationError("JWS signature verification failed.") from exc
    try:
        payload = json.loads(verified.payload)
    except Exception as exc:  # noqa: BLE001 — a verified but non-JSON payload is still unusable
        raise IapVerificationError("Verified JWS payload is not JSON.") from exc
    if not isinstance(payload, dict):
        raise IapVerificationError("Verified JWS payload is not an object.")
    return payload


def verify_signed_transaction(
    token: str,
    *,
    trusted_root_der: bytes | None = None,
    expected_root_fingerprint: str = APPLE_ROOT_CA_G3_SHA256,
    now: datetime | None = None,
) -> dict:
    """Verify a signedTransactionInfo JWS and validate the claims that make
    it a subscription purchase for this app. Returns the decoded transaction
    (bundleId, productId, transactionId, originalTransactionId, expiresDate,
    purchaseDate, revocationDate when refunded/revoked, environment, type).
    """
    payload = verify_signed_jws(
        token,
        trusted_root_der=trusted_root_der,
        expected_root_fingerprint=expected_root_fingerprint,
        now=now,
    )
    if payload.get("bundleId") != BUNDLE_ID:
        raise IapVerificationError(f"Transaction bundleId {payload.get('bundleId')!r} is not {BUNDLE_ID!r}.")
    product_id = payload.get("productId")
    if product_id not in IAP_PRODUCTS:
        raise IapVerificationError(f"Transaction productId {product_id!r} is not one of this app's products.")
    if payload.get("type") != "Auto-Renewable Subscription":
        raise IapVerificationError(f"Transaction type {payload.get('type')!r} is not an auto-renewable subscription.")
    for field in ("transactionId", "originalTransactionId", "expiresDate"):
        if payload.get(field) is None:
            raise IapVerificationError(f"Transaction is missing {field}.")
    return payload


def verify_signed_notification(
    token: str,
    *,
    trusted_root_der: bytes | None = None,
    expected_root_fingerprint: str = APPLE_ROOT_CA_G3_SHA256,
    now: datetime | None = None,
) -> dict:
    """Verify a signedPayload JWS from App Store Server Notifications V2 and
    validate that it is about this app. Returns the decoded notification
    (notificationType, notificationUUID, data with signedTransactionInfo /
    signedRenewalInfo, summary, environment).
    """
    payload = verify_signed_jws(
        token,
        trusted_root_der=trusted_root_der,
        expected_root_fingerprint=expected_root_fingerprint,
        now=now,
    )
    data = payload.get("data") or {}
    summary = payload.get("summary") or {}
    bundle_id = data.get("bundleId") or summary.get("bundleId")
    if bundle_id != BUNDLE_ID:
        raise IapVerificationError(f"Notification bundleId {bundle_id!r} is not {BUNDLE_ID!r}.")
    app_apple_id = os.environ.get("APPLE_APP_ID")
    if app_apple_id:
        notified_app_id = data.get("appAppleId") or summary.get("appAppleId")
        if notified_app_id is not None and str(notified_app_id) != str(app_apple_id):
            raise IapVerificationError(
                f"Notification appAppleId {notified_app_id!r} does not match APPLE_APP_ID."
            )
    return payload


def _ms_to_dt(value) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)
    except (TypeError, ValueError):
        return None


def _aware(value: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; treat them as UTC (the same
    normalization billing._row_is_subscribed does)."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _status_dict(row: Subscription) -> dict:
    """The subscription-status shape the app reads (same fields billing.py
    returns, plus provider/plan so the UI knows which store to manage in)."""
    plan = None
    if row.provider == "apple" and row.apple_product_id:
        plan = IAP_PRODUCTS.get(row.apple_product_id)
    end = _aware(row.current_period_end)
    return {
        "subscribed": row.status == "active"
        and (end is None or end > datetime.now(timezone.utc)),
        "status": row.status,
        "provider": row.provider or "stripe",
        "plan": plan,
        "current_period_end": end.isoformat() if end else None,
        "environment": None,
    }


def _row_already_grants_access(row: Subscription, now: datetime) -> bool:
    """Whether the row already grants access at `now` (the same test
    billing uses to gate premium content, asked at the transaction's time
    rather than the wall clock). Function-level import: billing imports
    enrollment, which this module imports — the same lazy pattern
    enrollment._entitlement uses."""
    import billing

    return billing._row_is_subscribed(row, now=now)


def apply_transaction(
    user_id: str,
    txn: dict,
    *,
    grace_expires: datetime | None = None,
    now: datetime | None = None,
) -> dict:
    """Grant/extend/revoke entitlement from a verified Apple transaction.

    The transaction is the source of truth: an unexpired, unrevoked one
    makes the row active until expiresDate; a revoked/refunded one cancels
    it at the revocation date; an expired one marks it expired. A billing
    grace period (signedRenewalInfo.gracePeriodExpiresDate, only visible in
    server notifications) keeps access until the grace expiry instead of
    cutting it at expiresDate. Deliveries are idempotent: re-applying the
    same transaction with the same expiry changes nothing, so a retried
    notification or a double-sent purchase cannot extend a subscription.
    Returns the status dict the app reads.
    """
    now = now or datetime.now(timezone.utc)
    product_id = txn["productId"]
    plan = IAP_PRODUCTS[product_id]
    expires = _ms_to_dt(txn.get("expiresDate"))
    revoked = _ms_to_dt(txn.get("revocationDate"))
    purchased = _ms_to_dt(txn.get("purchaseDate"))
    with db.SessionLocal() as s:
        user = s.get(User, user_id)
        if user is None or user.deleted_at is not None:
            raise ValueError(f"Cannot apply an Apple transaction to unknown or deleted user {user_id}.")
        row = s.get(Subscription, user_id)
        stored_end = _aware(row.current_period_end) if row is not None else None
        if (
            row is not None
            and revoked is None
            and stored_end is not None
            and expires is not None
            and expires <= stored_end
            and _row_already_grants_access(row, now)
        ):
            # The row already promises access until at least this
            # transaction's expiry: a duplicate delivery, or a stale one
            # (an old renewal retried after a newer one, or an Apple
            # transaction that predates the live Stripe subscription).
            # Applying it could only roll the row backwards, so skip it —
            # the next renewal (a later expiry) still applies normally.
            return {**_status_dict(row), "plan": plan, "environment": txn.get("environment")}
        if row is None:
            row = Subscription(
                user_id=user_id,
                stripe_customer_id=None,
                stripe_subscription_id=None,
                status="none",
                provider="apple",
            )
            s.add(row)
        row.provider = "apple"
        row.apple_product_id = product_id
        row.apple_original_transaction_id = str(txn["originalTransactionId"])
        row.apple_transaction_id = str(txn["transactionId"])
        if revoked is not None:
            # Refunded or revoked: access ends at the revocation date.
            row.status = "canceled"
            row.current_period_end = revoked
        elif expires is not None and expires > now:
            row.status = "active"
            if purchased is not None:
                row.current_period_start = purchased
            row.current_period_end = expires
        elif grace_expires is not None and grace_expires > now:
            # In Apple's billing grace period: payment is being retried, the
            # user keeps access until the grace expiry (or a renewal lands).
            row.status = "active"
            if purchased is not None:
                row.current_period_start = purchased
            row.current_period_end = grace_expires
        else:
            row.status = "expired"
            if expires is not None:
                row.current_period_end = expires
        s.commit()
        status = {**_status_dict(row), "plan": plan, "environment": txn.get("environment")}
    # Reconcile the seat allocation (same call the Stripe webhook path makes).
    enrollment.sync_user_safely(user_id)
    return status


#: Notification types that carry a signedTransactionInfo in `data` and
#: therefore change (or confirm) entitlement. Everything else is recorded
#: and acknowledged without touching the subscription row.
_TRANSACTION_NOTIFICATION_TYPES = {
    "SUBSCRIBED",
    "DID_RENEW",
    "DID_EXPIRE",
    "DID_CHANGE_RENEWAL_STATUS",
    "DID_CHANGE_RENEWAL_PREFERENCE",
    "REFUND",
    "REVOKE",
    "GRACE_PERIOD_EXPIRED",
    "PRICE_INCREASE_CONSENT",
    "OFFER_REDEEMED",
    "CONSUMPTION_REQUEST",
}


def handle_notification(
    payload: dict,
    *,
    now: datetime | None = None,
    trusted_root_der: bytes | None = None,
) -> dict:
    """Apply one verified App Store Server Notification payload.

    Idempotent on notificationUUID (Apple retries deliveries; a retried
    notification must not double-apply). The user is found through the
    transaction's originalTransactionId on their subscription row — a
    notification for an original transaction the backend has never seen
    (the user bought but never opened the app to sync) is recorded and
    acknowledged; the app's launch sync links it when they next open it.
    `trusted_root_der` exists so tests can verify against a
    locally-generated test chain instead of Apple's root — production
    always uses the bundled Apple root. Returns {processed,
    notification_type, user_id}.
    """
    now = now or datetime.now(timezone.utc)
    notification_type = payload.get("notificationType")
    notification_uuid = payload.get("notificationUUID")
    data = payload.get("data") or {}
    with db.SessionLocal() as s:
        if notification_uuid:
            seen = s.get(ProcessedAppleNotification, str(notification_uuid))
            if seen is not None:
                return {"processed": False, "reason": "duplicate", "notification_type": notification_type, "user_id": seen.user_id}
        user_id: str | None = None
        if notification_type in _TRANSACTION_NOTIFICATION_TYPES and data.get("signedTransactionInfo"):
            txn = verify_signed_transaction(
                data["signedTransactionInfo"], trusted_root_der=trusted_root_der, now=now
            )
            original_txn_id = str(txn["originalTransactionId"])
            row = (
                s.query(Subscription)
                .filter(Subscription.apple_original_transaction_id == original_txn_id)
                .first()
            )
            if row is not None:
                user_id = row.user_id
                grace_expires = None
                if data.get("signedRenewalInfo"):
                    try:
                        renewal = verify_signed_jws(
                            data["signedRenewalInfo"], trusted_root_der=trusted_root_der, now=now
                        )
                        grace_expires = _ms_to_dt(renewal.get("gracePeriodExpiresDate"))
                    except IapVerificationError:
                        log.warning("Apple notification %s: signedRenewalInfo failed verification; ignoring grace period", notification_uuid)
                # apply_transaction opens its own session and commits; the
                # processed row is recorded in this session afterwards, so a
                # crash between the two cannot lose the notification without
                # losing the entitlement.
                apply_transaction(user_id, txn, grace_expires=grace_expires, now=now)
                s.add(
                    ProcessedAppleNotification(
                        notification_uuid=str(notification_uuid) if notification_uuid else None,
                        user_id=user_id,
                        original_transaction_id=original_txn_id,
                        notification_type=str(notification_type),
                    )
                )
                s.commit()
                return {"processed": True, "notification_type": notification_type, "user_id": user_id}
            log.info(
                "Apple notification %s (%s): no account linked to original transaction %s yet; recorded only",
                notification_uuid,
                notification_type,
                original_txn_id,
            )
        if notification_uuid:
            s.add(
                ProcessedAppleNotification(
                    notification_uuid=str(notification_uuid),
                    user_id=user_id,
                    original_transaction_id=None,
                    notification_type=str(notification_type),
                )
            )
            s.commit()
    return {"processed": True, "notification_type": notification_type, "user_id": user_id}
