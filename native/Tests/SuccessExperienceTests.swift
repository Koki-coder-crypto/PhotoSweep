import XCTest
@testable import PhotoSweep

final class SuccessExperienceTests: XCTestCase {
    func testActivityClockExcludesBackgroundAndOtherSessions() {
        var clock = ReviewActivityClock()
        clock.set(session: "one", active: true, now: 100)
        clock.set(session: "one", active: false, now: 112)
        XCTAssertEqual(clock.seconds(now: 500), 12)
        clock.set(session: "one", active: true, now: 500)
        XCTAssertEqual(clock.seconds(now: 503), 15)
        clock.acknowledge(15, now: 504)
        XCTAssertEqual(clock.seconds(now: 505), 2)
        clock.set(session: "two", active: true, now: 600)
        XCTAssertEqual(clock.seconds(now: 601), 1)
    }
    func testRecordedPaceSurvivesRestartAndUndoWithoutInventingLegacyTiming() throws {
        var state = try ReviewEngine.start(ReviewState(), ids: ["one", "two"], scope: Scope(), pro: true)
        state = try ReviewEngine.decide(state, id: "one", choice: .keep, pro: true, activeSeconds: 4)
        state = try SQLitePersistence.decode(JSONEncoder().encode(state))
        XCTAssertEqual(state.session?.activeSeconds, 4)
        state = try ReviewEngine.decide(state, id: "two", choice: .candidate, pro: true, activeSeconds: 6)
        XCTAssertEqual(state.history.last?.timedReviewCount, 2)
        XCTAssertEqual(state.history.last?.activeSeconds, 10)
        state = try ReviewEngine.undo(state)
        XCTAssertEqual(state.session?.timedReviewCount, 1)
        XCTAssertTrue(state.history.isEmpty)
        var legacy = try ReviewEngine.start(ReviewState(), ids: ["old"], scope: Scope(), pro: true)
        legacy = try ReviewEngine.decide(legacy, id: "old", choice: .keep, pro: true)
        XCTAssertNil(legacy.history.first?.activeSeconds)
    }
    private func deleted(_ count: Int, bytes: Double = 1) throws -> ReviewState {
        let ids = (0..<count).map(String.init)
        var s = ReviewState()
        for id in ids { s.sizes[id] = AssetSize(bytes: bytes, quality: "measured-resource", basis: "test", modifiedAt: 0) }
        s = try ReviewEngine.stage(s, ids: ids, pro: true)
        s = try ReviewEngine.beginDeletion(s, ids: ids, free: 1_000)
        return try ReviewEngine.reconcile(s, status: "confirmed", deleted: ids, freeAfter: 1_000)
    }
    func testOfferRequiresConfirmedValueAndRespectsPaymentStateAndCooldown() throws {
        var s = try deleted(5)
        let now = WallClock().now
        XCTAssertTrue(SuccessExperience.mayOffer(s, pro: false, pending: false, now: now))
        XCTAssertFalse(SuccessExperience.mayOffer(s, pro: true, pending: false, now: now))
        XCTAssertFalse(SuccessExperience.mayOffer(s, pro: false, pending: true, now: now))
        XCTAssertFalse(SuccessExperience.mayOffer(try deleted(1), pro: false, pending: false, now: now))
        XCTAssertTrue(SuccessExperience.mayOffer(try deleted(1, bytes: 100_000_000), pro: false, pending: false, now: now))
        s.successOffer = SuccessOfferRecord(at: now, deletedCount: 5)
        XCTAssertFalse(SuccessExperience.mayOffer(s, pro: false, pending: false, now: now + 8 * 86_400_000))
        s.deletedCount = 25
        XCTAssertFalse(SuccessExperience.mayOffer(s, pro: false, pending: false, now: now + 86_400_000))
        XCTAssertTrue(SuccessExperience.mayOffer(s, pro: false, pending: false, now: now + 8 * 86_400_000))
        s.deletion?.status = "unknown"
        XCTAssertFalse(SuccessExperience.mayOffer(s, pro: false, pending: false, now: now + 8 * 86_400_000))
    }
    func testDeletedMediaSizeIsNotClaimedAsFreeStorage() throws {
        var outcome = try XCTUnwrap(deleted(1, bytes: 100_000_000).outcomes.first)
        XCTAssertEqual(outcome.knownBytes, 100_000_000)
        XCTAssertEqual(SuccessExperience.storageIncrease(outcome), 0)
        outcome.freeAfter = 1_500
        XCTAssertEqual(SuccessExperience.storageIncrease(outcome), 500)
        outcome.freeAfter = nil
        XCTAssertNil(SuccessExperience.storageIncrease(outcome))
        outcome.freeAfter = .nan
        XCTAssertNil(SuccessExperience.storageIncrease(outcome))
    }
}
