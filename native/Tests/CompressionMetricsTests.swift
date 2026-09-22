import XCTest
import SwiftUI
@testable import PhotoSweep

final class CompressionMetricsTests: XCTestCase {
    func testLiveFileSizesAndRestoredJournalHaveIdenticalResults() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let before = root.appendingPathComponent("before.bin"), after = root.appendingPathComponent("after.bin")
        try Data(repeating: 1, count: 120_000).write(to: before)
        try Data(repeating: 2, count: 45_000).write(to: after)
        let job: [String: Any] = [
            "inputBytes": try XCTUnwrap(before.resourceValues(forKeys: [.fileSizeKey]).fileSize),
            "outputBytes": try XCTUnwrap(after.resourceValues(forKeys: [.fileSizeKey]).fileSize)
        ]
        let restored = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONSerialization.data(withJSONObject: job)) as? [String: Any])
        for values in [job, restored, ["inputBytes": 120_000.0, "outputBytes": 45_000.0]] {
            let result = try XCTUnwrap(CompressionMetrics(job: values))
            XCTAssertEqual(result.inputBytes, 120_000)
            XCTAssertEqual(result.outputBytes, 45_000)
            XCTAssertEqual(result.savedBytes, 75_000)
            XCTAssertEqual(result.outputFraction, 0.375)
            XCTAssertTrue(result.isSmaller)
        }
    }

    func testInvalidMeasurementIsUnknownInsteadOfZero() {
        let invalid: [Any] = [0, -1, true, false, "123", NSNull(), Double.nan, Double.infinity, 1.5, Double(Int64.max)]
        XCTAssertNil(CompressionMetrics(job: [:]))
        for value in invalid {
            XCTAssertNil(CompressionMetrics(job: ["inputBytes": value, "outputBytes": 10]))
            XCTAssertNil(CompressionMetrics(job: ["inputBytes": 10, "outputBytes": value]))
        }
    }

    func testEqualAndLargerFilesNeverClaimSavings() throws {
        for output in [100, 150] {
            let result = try XCTUnwrap(CompressionMetrics(job: ["inputBytes": 100, "outputBytes": output]))
            XCTAssertFalse(result.isSmaller)
            XCTAssertEqual(result.savedBytes, 0)
            XCTAssertGreaterThanOrEqual(result.outputFraction, 1)
        }
    }

    func testSmallAndLargeReductionsDoNotRoundToFalseZeroOrHundred() throws {
        let small = try XCTUnwrap(CompressionMetrics(job: ["inputBytes": 10_000, "outputBytes": 9_999]))
        XCTAssertEqual(small.savedBytes, 1)
        XCTAssertTrue(small.reductionText.hasPrefix("<"))
        let large = try XCTUnwrap(CompressionMetrics(job: ["inputBytes": Int64(8_000_000_000), "outputBytes": 1]))
        XCTAssertEqual(large.savedBytes, 7_999_999_999)
        XCTAssertFalse(large.reductionText.contains("100"))
        XCTAssertFalse(CompressionMetrics.sizeText(1).contains("0 KB"))
    }

    /// Fixture renders for visual review only; these are not real compression or store screenshots.
    @MainActor func testResultCardVisualEvidence() throws {
        let cases: [(String, CompressionMetrics?, Bool)] = [
            ("smaller-unsaved", CompressionMetrics(job: ["inputBytes": 120_000_000, "outputBytes": 45_000_000]), false),
            ("smaller-saved", CompressionMetrics(job: ["inputBytes": 120_000_000, "outputBytes": 45_000_000]), true),
            ("larger", CompressionMetrics(job: ["inputBytes": 120_000_000, "outputBytes": 150_000_000]), false),
            ("unavailable", nil, false)
        ]
        for (name, metrics, saved) in cases {
            let renderer = ImageRenderer(content: CompressionResultCard(metrics: metrics, saved: saved)
                .padding(20).frame(width: 390).background(Color(uiColor: .systemGroupedBackground)))
            renderer.scale = 2
            let image = try XCTUnwrap(renderer.uiImage)
            let attachment = XCTAttachment(image: image)
            attachment.name = "compression-fixture-\(name)"
            attachment.lifetime = .keepAlways
            add(attachment)
        }
        let largeText = ImageRenderer(content: CompressionResultCard(metrics: cases[0].1, saved: false)
            .environment(\.dynamicTypeSize, .accessibility3).padding(20).frame(width: 320)
            .background(Color(uiColor: .systemGroupedBackground)))
        let attachment = XCTAttachment(image: try XCTUnwrap(largeText.uiImage))
        attachment.name = "compression-fixture-large-text"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
