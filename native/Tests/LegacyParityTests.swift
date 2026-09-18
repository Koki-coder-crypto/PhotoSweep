import XCTest
@testable import PhotoSweep

final class LegacyParityTests: XCTestCase {
    func testProductionLegacyFunctionFixtures() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "legacy-engine", withExtension: "json"))
        let fixtures = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [[String: Any]]
        let clock = WallClock(now: 1_790_000_000_000, day: "2026-09-21", timezoneOffset: -540)
        for fixture in fixtures {
            let name = fixture["name"] as! String, operation = fixture["operation"] as! String
            let state = try SQLitePersistence.decode(JSONSerialization.data(withJSONObject: fixture["input"]!))
            let ids = fixture["ids"] as! [String], pro = fixture["pro"] as! Bool
            var result: ReviewState?
            do {
                switch operation {
                case "stage": result = try ReviewEngine.stage(state, ids: ids, pro: pro, clock: clock)
                case "keep": result = try ReviewEngine.decide(state, id: ids[0], choice: .keep, pro: pro, clock: clock)
                case "skip": result = try ReviewEngine.decide(state, id: ids[0], choice: nil, pro: pro, clock: clock)
                case "undo": result = try ReviewEngine.undo(state)
                case "cancel": result = try ReviewEngine.reconcile(state, status: "cancelled")
                case "unknown": result = try ReviewEngine.reconcile(state, status: "unknown")
                case "delete": result = try ReviewEngine.reconcile(state, status: "confirmed", deleted: ids)
                default: XCTFail("Unknown fixture: \(name)")
                }
                XCTAssertFalse(fixture["error"] as! Bool, name)
            } catch { XCTAssertTrue(fixture["error"] as! Bool, name); continue }
            let native = try XCTUnwrap(result)
            let expected = try SQLitePersistence.decode(JSONSerialization.data(withJSONObject: fixture["expected"]!))
            XCTAssertEqual(Set(native.used), Set(expected.used), name)
            XCTAssertEqual(native.decisions.mapValues(\.choice), expected.decisions.mapValues(\.choice), name)
            XCTAssertEqual(native.session?.cursor, expected.session?.cursor, name)
            XCTAssertEqual(native.deletion?.status, expected.deletion?.status, name)
            XCTAssertEqual(native.deletedCount, expected.deletedCount, name)
            XCTAssertEqual(native.outcomes.count, expected.outcomes.count, name)
        }
    }
}
