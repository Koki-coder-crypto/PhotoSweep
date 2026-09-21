import XCTest
@testable import PhotoSweep

final class MediaIndexTests: XCTestCase {
    private func item(_ id: String, at: Double) -> MediaItem {
        MediaItem(id: id, kind: .photo, createdAt: at, width: 4000, height: 3000,
                  duration: 0, screenshot: false, recording: false, favorite: false, modifiedAt: at)
    }
    func testMonthBoundaryRespectsTimezoneAndDeduplicatesIDs() {
        let at = ISO8601DateFormatter().date(from: "2026-08-31T16:00:00Z")!.timeIntervalSince1970 * 1000
        let a = item("a", at: at)
        let japan = MediaIndex([a, a], timezone: TimeZone(secondsFromGMT: 9 * 3600)!)
        XCTAssertEqual(japan.months, ["2026-09"])
        XCTAssertEqual(japan.byMonth["2026-09"]?.count, 1)
        XCTAssertEqual(MediaIndex([a], timezone: TimeZone(secondsFromGMT: 0)!).months, ["2026-08"])
    }
    func testIndexRebuildRemovesMissingPhotosAndPreservesInputOrder() {
        let a = item("a", at: 1_780_000_000_000), b = item("b", at: 1_780_000_000_001)
        var index = MediaIndex([b, a])
        XCTAssertEqual(index.byMonth[index.months[0]]?.map(\.id), ["b", "a"])
        index = MediaIndex([a])
        XCTAssertNil(index.byID["b"])
        XCTAssertEqual(index.byID["a"], a)
    }
    func testLibraryScalesWithoutLosingItems() {
        for count in [500, 1000, 10000] {
            let items = (0..<count).map { item(String($0), at: 1_780_000_000_000 - Double($0) * 86_400_000) }
            let index = MediaIndex(items)
            XCTAssertEqual(index.byID.count, count)
            XCTAssertEqual(index.byMonth.values.reduce(0) { $0 + $1.count }, count)
            for item in items { XCTAssertEqual(index.byID[item.id], item) }
        }
    }
}
