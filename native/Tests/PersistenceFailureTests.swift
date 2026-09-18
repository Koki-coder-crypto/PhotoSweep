import XCTest
import SQLite3
@testable import PhotoSweep

actor FailingStore: ReviewPersistence {
    var state = ReviewState()
    func load() async throws -> ReviewState { state }
    func save(_ state: ReviewState) async throws { throw ReviewFailure.storage }
}
final class PersistenceFailureTests: XCTestCase {
    @MainActor func testFailureNeverPublishesDecisionOrConsumesQuota() async throws {
        let model = AppModel(persistence: FailingStore()); model.ready = true
        let initial = model.state
        let ok = await model.mutate { s in try ReviewEngine.stage(s, ids: ["a"], pro: false) }
        XCTAssertFalse(ok); XCTAssertEqual(model.state.used, initial.used); XCTAssertNil(model.state.decisions["a"])
        XCTAssertFalse(model.busy); XCTAssertNotNil(model.error)
    }
    func testInterruptedMigrationRollsBackAndCanRetry() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let native = root.appendingPathComponent("PhotoSweepNative"); try FileManager.default.createDirectory(at: native, withIntermediateDirectories: true)
        var db: OpaquePointer?; XCTAssertEqual(sqlite3_open(native.appendingPathComponent("photosweep-v2.db").path, &db), SQLITE_OK); defer { sqlite3_close(db) }
        XCTAssertEqual(sqlite3_exec(db, "CREATE TABLE state(id INTEGER PRIMARY KEY,payload TEXT); CREATE TRIGGER prevent_import BEFORE INSERT ON state BEGIN SELECT RAISE(ABORT,'disk write failed'); END;", nil, nil, nil), SQLITE_OK)
        let store = SQLitePersistence(documents: root)
        do { _ = try await store.load(); XCTFail("Injected write failure should abort migration") } catch {}
        var statement: OpaquePointer?; sqlite3_prepare_v2(db, "SELECT COUNT(*) FROM migration", -1, &statement, nil); XCTAssertEqual(sqlite3_step(statement), SQLITE_ROW); XCTAssertEqual(sqlite3_column_int(statement, 0), 0); sqlite3_finalize(statement)
        XCTAssertEqual(sqlite3_exec(db, "DROP TRIGGER prevent_import", nil, nil, nil), SQLITE_OK)
        let result = try await store.load(); XCTAssertTrue(result.used.isEmpty)
    }
}
