// swift-tools-version: 5.9
import PackageDescription

// Local Capacitor plugin (StoreKit 2, no SDK). Wired by `npx cap sync ios`,
// which adds this package to ios/App/CapApp-SPM/Package.swift. Mirrors the
// layout of the @capacitor/* plugins (Package.swift at the package root,
// Swift sources under ios/Sources/<Target>).
//
// The package and product names MUST be "R2cStorekit": that is the name
// Capacitor derives from the npm package name `r2c-storekit` (fixName:
// hyphens to camelCase, first letter capitalised) and writes into
// CapApp-SPM/Package.swift. SPM matches names case-sensitively, so a
// differently-cased name here ("R2CStoreKit") would fail resolution at
// Xcode build time. The Swift target and class keep their own names.
let package = Package(
    name: "R2cStorekit",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "R2cStorekit",
            targets: ["R2CStoreKitPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "R2CStoreKitPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/R2CStoreKit")
    ]
)
