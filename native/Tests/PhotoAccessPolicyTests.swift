import XCTest
import Photos
@testable import PhotoSweep

final class PhotoAccessPolicyTests: XCTestCase {
    func testFirstDecisionRequestsNativeAuthorizationWithoutOpeningSettings() {
        let policy = PhotoAccessPolicy(status: .notDetermined)
        XCTAssertEqual(policy.action, .request)
        XCTAssertEqual(policy.messageKey, "permission.notDetermined")
        XCTAssertFalse(policy.allowsSettings)
        XCTAssertFalse(policy.accessible)
    }
    func testLimitedAccessOffersNativeSelectionAndRetainsExistingAccess() {
        let policy = PhotoAccessPolicy(status: .limited)
        XCTAssertEqual(policy.action, .selectPhotos)
        XCTAssertEqual(policy.messageKey, "permission.limited")
        XCTAssertTrue(policy.accessible)
        XCTAssertTrue(policy.allowsSettings)
    }
    func testDeniedAccessExplainsSettingsAndNeverRepeatsInitialPrompt() {
        let policy = PhotoAccessPolicy(status: .denied)
        XCTAssertEqual(policy.action, .settings)
        XCTAssertEqual(policy.messageKey, "permission.deniedDetail")
        XCTAssertFalse(policy.accessible)
        XCTAssertTrue(policy.allowsSettings)
    }
    func testRestrictionDoesNotPromiseUserCanGrantAccess() {
        let policy = PhotoAccessPolicy(status: .restricted)
        XCTAssertEqual(policy.action, .unavailable)
        XCTAssertEqual(policy.messageKey, "permission.restricted")
        XCTAssertFalse(policy.allowsSettings)
        XCTAssertFalse(policy.accessible)
    }
    func testFullAccessShowsStatusAndOptionalManagement() {
        let policy = PhotoAccessPolicy(status: .authorized)
        XCTAssertEqual(policy.action, .settings)
        XCTAssertEqual(policy.messageKey, "permission.full")
        XCTAssertTrue(policy.accessible)
        XCTAssertTrue(policy.allowsSettings)
    }
}
