// Road to CISSP — StoreKit 2 in-app purchases (App Store Guideline 3.1.1).
//
// A small hand-written Capacitor plugin: StoreKit 2 directly, no
// RevenueCat, no paid SDK, no analytics. The product IDs are NOT hard-coded
// here — the web layer passes them in (see src/lib/iap.js), so the IDs live
// in one place per side (JS constants + backend/iap.py).
//
// What the plugin does, and what it deliberately does NOT do:
// - Fetches products from the App Store (the source of truth for whether
//   the products exist yet — an empty list means "not configured in App
//   Store Connect", and the UI hides the buy buttons).
// - Runs the StoreKit 2 purchase and returns the signed transaction JWS
//   (jwsRepresentation). It does NOT finish the transaction: the web layer
//   posts the JWS to POST /iap/verify first, and only calls
//   finishTransaction after the backend confirms the entitlement. That
//   NOTE: the signed JWS lives on VerificationResult, not on Transaction
//   (Transaction only has the unsigned jsonRepresentation). Always read it
//   from the VerificationResult that delivered the transaction —
//   transaction.jwsRepresentation does not exist and fails the build.
//   order is what makes a purchase survive an app kill mid-flight — an
//   unfinished transaction is re-delivered by StoreKit on next launch.
// - Listens to Transaction.updates and forwards verified transactions to
//   the web layer (renewals, Ask to Buy approvals, restores), which posts
//   each JWS to the backend and finishes it.
// - Exposes the current entitlements (restore purchases / launch sync)
//   and the system manage-subscriptions sheet.
//
// The Swift in this file cannot be compiled in the sandbox (no Mac, no
// Xcode). The compile check is the mobile.yml iOS Simulator build, which
// runs on push to main when ios/** or package.json change — run it (or the
// TestFlight job) after merge, before any device testing. Real StoreKit
// behaviour (purchase sheet, sandbox account, renewals) can only be
// exercised on a device or Simulator with a sandbox tester.
import Foundation
import Capacitor
import StoreKit

@objc(R2CStoreKitPlugin)
public class R2CStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "R2CStoreKitPlugin"
    public let jsName = "R2CStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishTransaction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showManageSubscriptions", returnType: CAPPluginReturnPromise)
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        // Forward StoreKit transaction updates (renewals, Ask to Buy
        // approvals, purchases finished on another device) to the web
        // layer, which verifies each JWS with the backend and finishes it.
        // Unverified transactions are never forwarded: a tampered
        // transaction must not reach the entitlement path.
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                switch result {
                case .verified(let transaction):
                    self.notifyListeners("transactionUpdate", data: [
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "productId": transaction.productID,
                        "signedTransaction": result.jwsRepresentation
                    ])
                case .unverified:
                    // Local verification failed (jailbroken device or a
                    // forged transaction): the backend is the source of
                    // truth, so this one is dropped, not delivered.
                    break
                }
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: - Products

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self), !productIds.isEmpty else {
            call.reject("getProducts requires a non-empty productIds array.")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: productIds)
                call.resolve([
                    "products": products.map { self.productDictionary($0) }
                ])
            } catch {
                // No network, StoreKit unavailable, or the App Store
                // rejected the request: the web layer treats a rejection
                // as "products unavailable" and hides the buy buttons.
                call.reject("Could not fetch App Store products: \(error.localizedDescription)")
            }
        }
    }

    private func productDictionary(_ product: Product) -> [String: Any] {
        var dict: [String: Any] = [
            "productId": product.id,
            "displayName": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            // Numeric price (in the product's currency) so the web layer
            // can compute the annual savings line from the App Store
            // prices instead of the Stripe ones — the tier amounts can
            // differ by currency. Product.price is a Decimal, which has
            // no doubleValue — go through NSDecimalNumber.
            "price": NSDecimalNumber(decimal: product.price).doubleValue,
            "currencyCode": product.priceFormatStyle.currencyCode
        ]
        if let subscription = product.subscription {
            // Product.SubscriptionPeriod.Unit is a plain enum
            // (day/week/month/year) with no rawValue — map it to the
            // strings the web layer expects.
            dict["subscriptionPeriodUnit"] = subscriptionPeriodUnitString(subscription.subscriptionPeriod.unit)
            dict["subscriptionPeriodValue"] = subscription.subscriptionPeriod.value
        }
        return dict
    }

    private func subscriptionPeriodUnitString(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day: return "day"
        case .week: return "week"
        case .month: return "month"
        case .year: return "year"
        @unknown default:
            // Unreachable for the current catalogue (monthly/yearly
            // only); a future Apple-added unit must not break the
            // product fetch.
            return "month"
        }
    }

    // MARK: - Purchase

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("purchase requires a productId.")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product \(productId) was not found in the App Store.")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        // Do NOT finish here: the web layer posts the JWS
                        // to the backend first and finishes only after the
                        // entitlement is confirmed (see finishTransaction).
                        call.resolve([
                            "state": "purchased",
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "productId": transaction.productID,
                            "signedTransaction": verification.jwsRepresentation
                        ])
                    case .unverified:
                        call.reject("The App Store transaction could not be verified on this device.")
                    }
                case .userCancelled:
                    call.resolve(["state": "cancelled"])
                case .pending:
                    // Ask to Buy (family approval) or another deferred
                    // payment: the transaction arrives later through the
                    // Transaction.updates listener.
                    call.resolve(["state": "pending"])
                @unknown default:
                    call.resolve(["state": "cancelled"])
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Entitlements / restore

    @objc func getCurrentEntitlements(_ call: CAPPluginCall) {
        Task {
            var transactions: [[String: Any]] = []
            for await result in Transaction.currentEntitlements {
                switch result {
                case .verified(let transaction):
                    transactions.append([
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "productId": transaction.productID,
                        "signedTransaction": result.jwsRepresentation
                    ])
                case .unverified:
                    break
                }
            }
            call.resolve(["transactions": transactions])
        }
    }

    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard let transactionId = call.getString("transactionId"), !transactionId.isEmpty else {
            call.reject("finishTransaction requires a transactionId.")
            return
        }
        Task {
            // Idempotent: a transaction that is already finished (or was
            // finished on another device) simply is not in the unfinished
            // list, and resolving anyway keeps the web layer from retrying.
            // Transaction.unfinished yields VerificationResult values, not
            // bare Transactions — unwrap before touching .id / .finish().
            unfinishedLoop: for await result in Transaction.unfinished {
                switch result {
                case .verified(let transaction):
                    if String(transaction.id) == transactionId {
                        await transaction.finish()
                        break unfinishedLoop
                    }
                case .unverified:
                    break
                }
            }
            call.resolve([:])
        }
    }

    // MARK: - Manage subscriptions

    @objc func showManageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.subscriptionScene() else {
                call.reject("Could not find a window scene to show the subscription manager.")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve([:])
            } catch {
                call.reject("Could not open subscription management: \(error.localizedDescription)")
            }
        }
    }

    @MainActor
    private func subscriptionScene() -> UIWindowScene? {
        if let scene = self.bridge?.viewController?.view.window?.windowScene {
            return scene
        }
        return UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene
            ?? UIApplication.shared.connectedScenes.first as? UIWindowScene
    }
}
