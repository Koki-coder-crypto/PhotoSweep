import XCTest
@testable import PhotoSweep

final class BillingCatalogTests: XCTestCase {
    private func offer(price: Decimal = 10, currency: String = "USD", storefront: String = "USA",
                       display: String = "$10.00", period: String? = "1:month",
                       intro: BillingOffer.IntroductoryOffer? = nil) -> BillingOffer {
        BillingOffer(productID: BillingPolicy.saleIDs[0], storefrontID: storefront,
            currencyCode: currency, price: price, displayPrice: display,
            subscriptionPeriod: period, introductoryOffer: intro)
    }
    private func entry(_ quote: BillingOffer, item: Int = 1) -> BillingCatalog<Int>.Entry {
        .init(item: item, offer: quote, trialEligible: quote.introductoryOffer != nil)
    }
    func testUnchangedOfferUsesFreshProductInstance() {
        var catalog = BillingCatalog<Int>()
        let shown = offer()
        let old = catalog.beginRefresh()
        catalog.complete([entry(shown, item: 1)], request: old)
        let fresh = catalog.beginRefresh()
        XCTAssertNil(catalog.item(matching: shown, storefrontID: "USA"))
        catalog.complete([entry(shown, item: 2)], request: fresh)
        XCTAssertEqual(catalog.item(matching: shown, storefrontID: "USA"), 2)
    }
    func testChangedPriceCurrencyStorefrontDisplayAndPeriodRequireAnotherTap() {
        let shown = offer()
        let changed = [offer(price: 11), offer(currency: "CAD"), offer(storefront: "JPN"),
                       offer(display: "US$10.00"), offer(period: "1:year"),
                       offer(price: 1500, currency: "JPY", storefront: "JPN", display: "¥1,500")]
        for updated in changed {
            var catalog = BillingCatalog<Int>()
            let request = catalog.beginRefresh()
            catalog.complete([entry(updated)], request: request)
            XCTAssertNil(catalog.item(matching: shown, storefrontID: updated.storefrontID))
            // A deliberate new tap with the updated quote is allowed.
            XCTAssertEqual(catalog.item(matching: updated, storefrontID: updated.storefrontID), 1)
        }
    }
    func testTrialEligibilityAndTermsArePartOfDisplayedOffer() {
        let sevenDays = BillingOffer.IntroductoryOffer(price: 0, displayPrice: "$0.00",
            paymentMode: "freeTrial", period: "1:week", periodCount: 1)
        let shorter = BillingOffer.IntroductoryOffer(price: 0, displayPrice: "$0.00",
            paymentMode: "freeTrial", period: "3:day", periodCount: 1)
        let paid = BillingOffer.IntroductoryOffer(price: 1, displayPrice: "$1.00",
            paymentMode: "payAsYouGo", period: "1:week", periodCount: 1)
        let shown = offer(intro: sevenDays)
        for updated in [offer(), offer(intro: shorter), offer(intro: paid)] {
            var catalog = BillingCatalog<Int>()
            let request = catalog.beginRefresh()
            catalog.complete([entry(updated)], request: request)
            XCTAssertNil(catalog.item(matching: shown, storefrontID: "USA"))
        }
    }
    func testStorefrontChangesAfterFetchBlockPurchase() {
        var catalog = BillingCatalog<Int>()
        let request = catalog.beginRefresh()
        catalog.complete([entry(offer())], request: request)
        XCTAssertNil(catalog.item(matching: offer(), storefrontID: "JPN"))
        XCTAssertNil(catalog.item(matching: offer(), storefrontID: nil))
    }
    func testOlderSuccessCannotOverwriteNewCatalog() {
        var catalog = BillingCatalog<Int>()
        let old = catalog.beginRefresh()
        let new = catalog.beginRefresh()
        catalog.complete([entry(offer(currency: "JPY"), item: 2)], request: new)
        XCTAssertFalse(catalog.complete([entry(offer())], request: old))
        XCTAssertEqual(catalog.entries.first?.item, 2)
        XCTAssertFalse(catalog.isRefreshing)
    }
    func testOlderFailureCannotEraseNewCatalogOrEndItsLoadingState() {
        var catalog = BillingCatalog<Int>()
        let old = catalog.beginRefresh()
        let new = catalog.beginRefresh()
        XCTAssertFalse(catalog.fail(request: old))
        XCTAssertTrue(catalog.isRefreshing)
        catalog.complete([entry(offer(), item: 2)], request: new)
        XCTAssertFalse(catalog.fail(request: old))
        XCTAssertEqual(catalog.entries.first?.item, 2)
    }
    func testFailureAndMissingProductBlockStalePurchaseAndRetryRecovers() {
        var catalog = BillingCatalog<Int>()
        let first = catalog.beginRefresh()
        catalog.complete([entry(offer())], request: first)
        let failing = catalog.beginRefresh()
        catalog.fail(request: failing)
        XCTAssertFalse(catalog.isRefreshing)
        XCTAssertTrue(catalog.entries.isEmpty)
        XCTAssertNil(catalog.item(matching: offer(), storefrontID: "USA"))
        let empty = catalog.beginRefresh()
        catalog.complete([], request: empty)
        XCTAssertNil(catalog.item(matching: offer(), storefrontID: "USA"))
        let retry = catalog.beginRefresh()
        catalog.complete([entry(offer(), item: 3)], request: retry)
        XCTAssertEqual(catalog.item(matching: offer(), storefrontID: "USA"), 3)
    }
    func testStorefrontRoundTripCannotResurrectOldResponse() {
        var catalog = BillingCatalog<Int>()
        let originalUSA = catalog.beginRefresh()
        _ = catalog.beginRefresh() // JPN notification invalidates USA.
        let returnedUSA = catalog.beginRefresh()
        catalog.complete([entry(offer(), item: 3)], request: returnedUSA)
        XCTAssertFalse(catalog.complete([entry(offer(), item: 1)], request: originalUSA))
        XCTAssertEqual(catalog.entries.first?.item, 3)
    }
}

@MainActor final class BillingRequestTests: XCTestCase {
    func testSuccessfulRequestReturnsValue() async throws {
        let value = try await BillingRequest<Int>().run { 42 }
        XCTAssertEqual(value, 42)
    }
    func testTimeoutReturnsEvenWhenOperationIgnoresCancellation() async {
        var lateResult: CheckedContinuation<Int, Never>?
        let result = Task {
            try await BillingRequest<Int>().run(timeoutNanoseconds: 1_000_000) {
                await withCheckedContinuation { lateResult = $0 }
            }
        }
        do { _ = try await result.value; XCTFail("Expected a timeout") }
        catch { XCTAssertTrue(error is BillingRequest<Int>.Failure) }
        XCTAssertNotNil(lateResult)
        lateResult?.resume(returning: 42) // Late response must not resume the request twice.
        await Task.yield()
    }
    func testCancellationReturnsWithoutWaitingForStoreKit() async {
        var lateResult: CheckedContinuation<Int, Never>?
        let result = Task {
            try await BillingRequest<Int>().run {
                await withCheckedContinuation { lateResult = $0 }
            }
        }
        while lateResult == nil { await Task.yield() }
        result.cancel()
        do { _ = try await result.value; XCTFail("Expected cancellation") }
        catch { XCTAssertTrue(error is CancellationError) }
        lateResult?.resume(returning: 42)
        await Task.yield()
    }
    func testAlreadyCancelledRequestDoesNotStartLoading() async {
        var started = false
        let result = Task {
            withUnsafeCurrentTask { $0?.cancel() }
            return try await BillingRequest<Int>().run { started = true; return 1 }
        }
        _ = await result.result
        XCTAssertFalse(started)
    }
    func testCatalogFailurePreservesLifetimeRightsAndPendingApproval() async {
        struct Offline: Error {}
        let billing = Billing(observeUpdates: false, productLoader: { throw Offline() })
        billing.hasPro = true; billing.entitlementName = "plan.lifetime"
        billing.pending = true; billing.pendingChecked = true
        let loaded = await billing.reloadProducts()
        XCTAssertFalse(loaded)
        XCTAssertTrue(billing.allowsPro)
        XCTAssertTrue(billing.pending)
        XCTAssertTrue(billing.pendingChecked)
        XCTAssertFalse(billing.loadingProducts)
        XCTAssertFalse(billing.busy)
    }
    func testCatalogFailurePreservesSubscriptionFacts() async {
        struct Offline: Error {}
        let billing = Billing(observeUpdates: false, productLoader: { throw Offline() })
        let expiry = Date().addingTimeInterval(3600)
        billing.hasPro = true; billing.entitlementName = "plan.active"
        billing.expiry = expiry; billing.autoRenew = true; billing.trial = true
        _ = await billing.reloadProducts()
        XCTAssertTrue(billing.allowsPro)
        XCTAssertEqual(billing.expiry, expiry)
        XCTAssertTrue(billing.autoRenew)
        XCTAssertTrue(billing.trial)
    }
}
