import XCTest
@testable import PhotoSweep

final class HomeMediaTests: XCTestCase {
    private func item(_ id: String, _ kind: MediaKind = .photo, screenshot: Bool = false, recording: Bool = false) -> MediaItem {
        MediaItem(id: id, kind: kind, createdAt: 1000, width: 900, height: 1200, duration: kind == .video ? 10 : 0,
                  screenshot: screenshot, recording: recording, favorite: false, modifiedAt: 1000)
    }
    func testCategoriesUseRealMatchingMediaAndBoundPreviews() {
        let photo = item("p")
        let photos = [photo, photo, item("screen", screenshot: true), item("v", .video), item("rec", .video, recording: true)]
        let sizes = ["rec": AssetSize(bytes: 200, quality: "exact", basis: "local", modifiedAt: 1000)]
        let summaries = HomeMediaSummary.build(photos: photos, groups: [], sizes: sizes)
        XCTAssertEqual(summaries[.all]?.count, 2)
        XCTAssertEqual(summaries[.screenshots]?.ids, ["screen"])
        XCTAssertEqual(summaries[.recordings]?.ids, ["rec"])
        XCTAssertEqual(summaries[.videos]?.ids, ["rec", "v"])
        XCTAssertEqual(summaries[.videos]?.videoID, "rec")
        XCTAssertEqual(summaries[.similar]?.count, 0)
        let many = HomeMediaSummary.build(photos: (0..<10000).map { item(String($0)) }, groups: [], sizes: [:])
        XCTAssertEqual(many[.all]?.count, 10000)
        XCTAssertEqual(many[.all]?.ids.count, 3)
    }
    func testComparisonNeverMixesGroupsOrUsesStaleAssets() {
        let groups = [PhotoGroup(id: "invalid", ids: ["a", "a", "missing", "video"], recommended: "a", kind: "similar"),
                      PhotoGroup(id: "pair", ids: ["b", "c"], recommended: "b", kind: "similar")]
        let result = HomeMediaSummary.build(photos: [item("a"), item("b"), item("c"), item("video", .video)], groups: groups, sizes: [:])
        XCTAssertEqual(result[.similar]?.ids, ["b", "c"])
        XCTAssertEqual(result[.similar]?.count, 2)
        XCTAssertTrue(result[.duplicate]?.ids.isEmpty == true)
    }
    @MainActor func testOnlyOneMostlyVisibleVideoCanPlay() {
        let summaries: [Category: HomeMediaSummary] = [.videos: .init(ids: ["v"], count: 1, videoID: "v"),
                                                      .recordings: .init(ids: ["r"], count: 1, videoID: "r")]
        XCTAssertNil(HomePreviewPlayer.visibleCategory(frames: [.videos: CGRect(x: 0, y: -100, width: 300, height: 200)], height: 600, summaries: summaries))
        XCTAssertEqual(HomePreviewPlayer.visibleCategory(frames: [.videos: CGRect(x: 0, y: 0, width: 300, height: 200),
                                                                  .recordings: CGRect(x: 0, y: 200, width: 300, height: 200)], height: 600, summaries: summaries), .recordings)
        XCTAssertNil(HomePreviewPlayer.visibleCategory(frames: [:], height: 600, summaries: summaries))
    }
}
