import XCTest
@testable import PhotoSweep

final class BillingPolicyTests: XCTestCase {
    let now = Date(timeIntervalSince1970: 1000)
    let monthly = BillingPolicy.prefix + "monthly"
    func testValidSubscriptionAndBoundaryExpiry() {
        let record = BillingEvidence(productID: monthly, expiration: Date(timeIntervalSince1970: 1001), autoRenew: false)
        XCTAssertTrue(BillingPolicy.entitlement([record], now: now).active)
        XCTAssertFalse(BillingPolicy.entitlement([record], now: Date(timeIntervalSince1970: 1001)).active)
        XCTAssertFalse(BillingPolicy.entitlement([record], now: now).autoRenew)
    }
    func testUnverifiedRevokedUpgradedAndUnknownNeverGrant() {
        let future = now.addingTimeInterval(100)
        for record in [BillingEvidence(productID: monthly, verified: false, expiration: future),
                       BillingEvidence(productID: monthly, revoked: true, expiration: future),
                       BillingEvidence(productID: monthly, upgraded: true, expiration: future),
                       BillingEvidence(productID: "unknown", expiration: future)] {
            XCTAssertFalse(BillingPolicy.entitlement([record], now: now).active)
        }
    }
    func testLifetimeWinsInEitherOrderAndRefundRemovesAccess() {
        var lifetime = BillingEvidence(productID: BillingPolicy.prefix + "lifetime")
        let sub = BillingEvidence(productID: monthly, expiration: now.addingTimeInterval(100))
        XCTAssertEqual(BillingPolicy.entitlement([sub, lifetime], now: now).label, "plan.lifetime")
        XCTAssertEqual(BillingPolicy.entitlement([lifetime, sub], now: now).label, "plan.lifetime")
        lifetime.revoked = true
        XCTAssertFalse(BillingPolicy.entitlement([lifetime], now: now).active)
    }
    func testLegacyAndRenewalStayAttachedToSelectedProduct() {
        let old = BillingEvidence(productID: BillingPolicy.prefix + "annual", expiration: now.addingTimeInterval(200), autoRenew: false)
        let new = BillingEvidence(productID: monthly, expiration: now.addingTimeInterval(100), autoRenew: true)
        let result = BillingPolicy.entitlement([new, old], now: now)
        XCTAssertEqual(result.productID, old.productID)
        XCTAssertFalse(result.autoRenew)
        XCTAssertEqual(result, BillingPolicy.entitlement([old, new], now: now))
    }
    func testGraceExpiresWithoutRenewal() {
        let grace = BillingEvidence(productID: monthly, expiration: now.addingTimeInterval(-1), graceExpiration: now.addingTimeInterval(10), autoRenew: true)
        XCTAssertEqual(BillingPolicy.entitlement([grace], now: now).label, "plan.grace")
        XCTAssertFalse(BillingPolicy.entitlement([grace], now: now.addingTimeInterval(10)).active)
    }
    func testPendingMigrationAndTimestampRoundTrip() throws {
        let old = try JSONDecoder().decode(PendingPurchase.self, from: Data("{\"productID\":\"legacy\"}".utf8))
        XCTAssertNil(old.startedAt)
        let pending = PendingPurchase(productID: monthly, startedAt: now)
        let restored = try JSONDecoder().decode(PendingPurchase.self, from: JSONEncoder().encode(pending))
        XCTAssertEqual(restored.startedAt, now)
        XCTAssertEqual(restored.productID, monthly)
    }
}
