import XCTest
import StoreKit
import StoreKitTest
import Photos
@testable import PhotoSweep

@MainActor final class StoreBillingTests: XCTestCase {
    func testPrepareCaptureEntitlement() async throws {
        let session = try session()
        let billing = Billing()
        await billing.load()
        let product = try XCTUnwrap(billing.products.first { $0.id.hasSuffix("lifetime") })
        await billing.purchase(product)
        XCTAssertTrue(billing.allowsPro, "Capture setup must use a verified Apple test transaction")
        XCTAssertEqual(session.allTransactions().count, 1)
        // Keep the real StoreKit test transaction for the following UI process.
        // This hosted test runs inside the app bundle, not the UI runner bundle.
    }
    private func session() throws -> SKTestSession {
        let session = try SKTestSession(configurationFileNamed: "Capture")
        session.resetToDefaultState(); session.clearTransactions(); session.disableDialogs = true
        return session
    }
    func testLifetimePurchaseRestoreAndRefund() async throws {
        let session = try session()
        let billing = Billing()
        await billing.load()
        let product = try XCTUnwrap(billing.products.first { $0.id.hasSuffix("lifetime") })
        await billing.purchase(product)
        XCTAssertTrue(billing.allowsPro)
        let relaunched = Billing()
        await relaunched.restore()
        XCTAssertTrue(relaunched.allowsPro)
        let transaction = try XCTUnwrap(session.allTransactions().first)
        try session.refundTransaction(identifier: transaction.identifier)
        await relaunched.restore()
        XCTAssertFalse(relaunched.allowsPro)
    }
    func testPendingApprovalDoesNotGrantPrematureAccess() async throws {
        let session = try session(); session.askToBuyEnabled = true
        let billing = Billing(); await billing.load()
        let product = try XCTUnwrap(billing.products.first { $0.id.hasSuffix("monthly") })
        await billing.purchase(product)
        XCTAssertTrue(billing.pending); XCTAssertFalse(billing.allowsPro)
        let relaunched = Billing()
        XCTAssertTrue(relaunched.pending)
        let transaction = try XCTUnwrap(session.allTransactions().first)
        try session.approveAskToBuyTransaction(identifier: transaction.identifier)
        await relaunched.restore()
        XCTAssertTrue(relaunched.allowsPro); XCTAssertFalse(relaunched.pending)
    }
    func testDeclinedPendingCanReturnToPlansAfterRecheck() async throws {
        let session = try session(); session.askToBuyEnabled = true
        let billing = Billing(); await billing.load()
        let product = try XCTUnwrap(billing.products.first { $0.id.hasSuffix("monthly") })
        await billing.purchase(product)
        let transaction = try XCTUnwrap(session.allTransactions().first)
        try session.declineAskToBuyTransaction(identifier: transaction.identifier)
        await billing.recheckPending()
        XCTAssertFalse(billing.allowsPro)
        billing.allowPurchaseRetry()
        XCTAssertFalse(billing.pending)
        XCTAssertFalse(billing.allowsPro)
    }
    func testCapturePhotoAnalysisEvidence() async throws {
        guard PhotoSweepAnalysis.allowed() else { throw XCTSkip("Photo permission not granted in the capture simulator") }
        let photos = PHAsset.fetchAssets(with: .image, options: nil)
        var ids: [String] = [], resourceCounts: [Int] = []
        photos.enumerateObjects { asset, _, _ in
            ids.append(asset.localIdentifier)
            resourceCounts.append(PHAssetResource.assetResources(for: asset).count)
        }
        let prints = await Task.detached { PhotoSweepAnalysis.fingerprints(ids) }.value
        let digests = await Task.detached { PhotoSweepAnalysis.digests(ids) }.value
        let message = "photos=\(ids.count), resourceCounts=\(resourceCounts), fingerprints=\(prints.count), exactEligible=\(prints.filter { $0["exactEligible"] as? Bool == true }.count), digests=\(digests.count)"
        let attachment = XCTAttachment(string: message)
        attachment.name = "photo-analysis-counts"; attachment.lifetime = .keepAlways; add(attachment)
        XCTAssertGreaterThanOrEqual(ids.count, 4, message)
        XCTAssertGreaterThanOrEqual(prints.count, 4, message)
        XCTAssertGreaterThanOrEqual(digests.count, 4, message)
    }
}
