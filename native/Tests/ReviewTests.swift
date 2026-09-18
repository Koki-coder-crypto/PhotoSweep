import XCTest
import SQLite3
@testable import PhotoSweep

final class ReviewTests: XCTestCase {
    private let clock = WallClock(now: 1_790_000_000_000, day: "2026-09-21", timezoneOffset: -540)
    func testPhotoBoundaryUndoAndRejudgeDoNotRefund() throws {
        var state = ReviewState(clock: clock)
        state.used = (0..<29).map { "old\($0)" }
        state = try ReviewEngine.start(state, ids: ["a", "b"], scope: Scope(), pro: false, clock: clock)
        XCTAssertEqual(state.session?.ids, ["a"])
        state = try ReviewEngine.decide(state, id: "a", choice: .keep, pro: false, clock: clock)
        XCTAssertEqual(ReviewEngine.remaining(state, .photo), 0)
        state = try ReviewEngine.undo(state)
        state = try ReviewEngine.decide(state, id: "a", choice: .candidate, pro: false, clock: clock)
        XCTAssertEqual(state.used.count, 30)
        XCTAssertThrowsError(try ReviewEngine.stage(state, ids: ["b"], pro: false, clock: clock))
    }
    func testIndependentVideoBoundaryAndAtomicMixedSelection() throws {
        var state = ReviewState(clock: clock)
        for index in 0..<4 { state.mediaKinds["v\(index)"] = .video; state.used.append("v\(index)") }
        state.mediaKinds["v4"] = .video; state.mediaKinds["v5"] = .video
        state = try ReviewEngine.stage(state, ids: ["v4", "photo"], pro: false, clock: clock)
        XCTAssertEqual(ReviewEngine.remaining(state, .video), 0); XCTAssertEqual(ReviewEngine.remaining(state, .photo), 29)
        XCTAssertThrowsError(try ReviewEngine.stage(state, ids: ["v5", "other"], pro: false, clock: clock))
        XCTAssertNil(state.decisions["other"])
    }
    func testRejudgingAndSkipDoNotConsume() throws {
        var state = ReviewState(clock: clock)
        state = try ReviewEngine.start(state, ids: ["a", "b"], scope: Scope(), pro: false, clock: clock)
        state = try ReviewEngine.decide(state, id: "a", choice: nil, pro: false, clock: clock)
        XCTAssertTrue(state.used.isEmpty)
        state = try ReviewEngine.stage(state, ids: ["b", "b"], pro: false, clock: clock)
        state = try ReviewEngine.stage(state, ids: ["b"], pro: false, clock: clock)
        XCTAssertEqual(state.used, ["b"])
    }
    func testDayAdvanceRollbackAndTimezone() {
        var state = ReviewState(clock: clock); state.used = ["a"]
        let nextDay = WallClock(now: clock.now + 86_400_000, day: "2026-09-22", timezoneOffset: -540)
        XCTAssertTrue(ReviewEngine.refresh(state, nextDay).used.isEmpty)
        XCTAssertEqual(ReviewEngine.refresh(state, WallClock(now: clock.now - 1, day: "2026-09-22", timezoneOffset: -540)).used, ["a"])
        state = ReviewEngine.refresh(state, WallClock(now: nextDay.now, day: nextDay.day, timezoneOffset: 0))
        XCTAssertEqual(state.used, ["a"])
        XCTAssertEqual(ReviewEngine.refresh(state, WallClock(now: nextDay.now + 1, day: nextDay.day, timezoneOffset: 0)).used, ["a"])
    }
    func testMonthResumeAndProExpiry() throws {
        var state = ReviewState(clock: clock)
        state = try ReviewEngine.start(state, ids: ["a", "b"], scope: Scope(month: "2026-09"), pro: false, clock: clock)
        state = try ReviewEngine.decide(state, id: "a", choice: .keep, pro: false, clock: clock)
        state = try ReviewEngine.start(state, ids: ["c"], scope: Scope(month: "2026-08"), pro: false, clock: clock)
        state = try ReviewEngine.start(state, ids: ["a", "b", "d"], scope: Scope(month: "2026-09"), pro: false, clock: clock)
        XCTAssertEqual(state.session?.cursor, 1); XCTAssertEqual(state.session?.ids, ["a", "b"])
        state.used = (0..<30).map { "used\($0)" }
        XCTAssertThrowsError(try ReviewEngine.start(state, ids: ["new"], scope: Scope(month: "2026-10"), pro: false, clock: clock))
    }
    func testDeleteIntentUnknownCancelAndIdempotentResult() throws {
        var state = ReviewState(clock: clock)
        state = try ReviewEngine.stage(state, ids: ["a", "b"], pro: false, clock: clock)
        state.sizes["a"] = AssetSize(bytes: 100, quality: "measured-resource", basis: "original-resource", modifiedAt: clock.now)
        state = try ReviewEngine.beginDeletion(state, ids: ["a", "b"], free: 1_000, clock: clock)
        state = try ReviewEngine.reconcile(state, status: "unknown")
        XCTAssertThrowsError(try ReviewEngine.undo(state))
        XCTAssertThrowsError(try ReviewEngine.reconcile(state, status: "confirmed", deleted: ["unrequested"]))
        state = try ReviewEngine.reconcile(state, status: "confirmed", deleted: ["a"], freeAfter: 1_020)
        XCTAssertEqual(state.deletion?.status, "partial"); XCTAssertEqual(state.deletedCount, 1)
        XCTAssertEqual(state.outcomes.first?.knownBytes, 100); XCTAssertEqual(state.outcomes.first?.freeAfter, 1_020)
        state = try ReviewEngine.reconcile(state, status: "confirmed", deleted: ["a"])
        XCTAssertEqual(state.deletedCount, 1); XCTAssertEqual(state.outcomes.count, 1)
        state = try ReviewEngine.beginDeletion(state, ids: ["b"], free: nil, clock: clock)
        state = try ReviewEngine.reconcile(state, status: "cancelled")
        XCTAssertEqual(state.deletedCount, 1); XCTAssertNotNil(state.decisions["b"])
    }
    func testReviewFrequencyAndDifferentDays() {
        var state = ReviewState(clock: clock)
        func outcome(_ id: String, _ at: Double) -> Outcome { Outcome(id: id, at: at, photoCount: 1, videoCount: 0, knownBytes: 0, unknownCount: 1, estimated: false) }
        state.outcomes = [outcome("a", clock.now), outcome("b", clock.now)]
        XCTAssertFalse(ReviewEngine.mayRequestReview(state, version: "2", clock: clock))
        state.outcomes.append(outcome("c", clock.now - 86_400_000))
        XCTAssertTrue(ReviewEngine.mayRequestReview(state, version: "2", clock: clock))
        state.reviewPrompt = ReviewPrompt(at: clock.now - 121 * 86_400_000, version: "2")
        XCTAssertFalse(ReviewEngine.mayRequestReview(state, version: "2", clock: clock))
        XCTAssertTrue(ReviewEngine.mayRequestReview(state, version: "3", clock: clock))
    }
    func testThousandAndTenThousandRecords() throws {
        for count in [1_000, 10_000] {
            var state = ReviewState(clock: clock); state.settings.batch = 100
            state = try ReviewEngine.start(state, ids: (0..<count).map(String.init), scope: Scope(), pro: true, clock: clock)
            XCTAssertEqual(state.session?.target, 100)
            for index in 0..<100 { state = try ReviewEngine.decide(state, id: String(index), choice: .keep, pro: true, clock: clock) }
            XCTAssertEqual(state.history.count, 1); XCTAssertEqual(state.decisions.count, 100); XCTAssertTrue(state.used.isEmpty)
        }
    }
    func testLegacyDecodePreservesMillisecondsQuotaAndOnboarding() throws {
        var state = ReviewState(clock: clock); state.version = 1; state.onboarded = true; state.used = (0..<50).map(String.init)
        state.decisions["photo/L0/001"] = Decision(choice: .candidate, at: clock.now, sessionId: "old")
        var json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(state)) as! [String: Any]
        for key in ["mediaKinds", "monthSessions", "sizes", "outcomes", "monthHintSeen"] { json.removeValue(forKey: key) }
        let imported = try SQLitePersistence.decode(JSONSerialization.data(withJSONObject: json))
        XCTAssertFalse(imported.needsOnboarding); XCTAssertEqual(imported.used.count, 50); XCTAssertEqual(ReviewEngine.remaining(imported, .photo), 0)
        XCTAssertEqual(imported.timezoneOffset, -540); XCTAssertEqual(imported.decisions["photo/L0/001"]?.at, clock.now)
    }
    func testSQLiteRoundTripAndCorruptLegacyBlocksBlankStartup() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let db = SQLitePersistence(documents: root)
        var state = try await db.load(); state.used = ["a"]; try await db.save(state)
        let loaded = try await db.load(); XCTAssertEqual(loaded.used, ["a"])
        let other = root.appendingPathComponent("broken"); try FileManager.default.createDirectory(at: other.appendingPathComponent("SQLite"), withIntermediateDirectories: true)
        try Data("not a database".utf8).write(to: other.appendingPathComponent("SQLite/photosweep-v1.db"))
        do { _ = try await SQLitePersistence(documents: other).load(); XCTFail("Must not open blank state") } catch {}
    }
    func testWALMigrationCopiesCommittedDecisionsAndRetainsOriginal() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let folder = root.appendingPathComponent("SQLite"); try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let file = folder.appendingPathComponent("photosweep-v1.db")
        var db: OpaquePointer?; XCTAssertEqual(sqlite3_open(file.path, &db), SQLITE_OK); defer { sqlite3_close(db) }
        var state = ReviewState(clock: clock); state.used = ["wal-photo"]; state.onboarded = true
        let payload = String(data: try JSONEncoder().encode(state), encoding: .utf8)!.replacingOccurrences(of: "'", with: "''")
        let sql = "PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE decisions(id TEXT PRIMARY KEY,choice TEXT,at REAL,session_id TEXT); INSERT INTO meta VALUES('state','\(payload)'); INSERT INTO decisions VALUES('wal-photo','candidate',\(clock.now),'legacy');"
        XCTAssertEqual(sqlite3_exec(db, sql, nil, nil, nil), SQLITE_OK)
        let imported = try await SQLitePersistence(documents: root).load()
        XCTAssertEqual(imported.decisions["wal-photo"]?.choice, .candidate); XCTAssertEqual(imported.used, ["wal-photo"])
        XCTAssertTrue(FileManager.default.fileExists(atPath: file.path)); XCTAssertFalse(imported.needsOnboarding)
    }
}
