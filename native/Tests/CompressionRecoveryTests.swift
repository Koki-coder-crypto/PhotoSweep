import XCTest
@testable import PhotoSweep

final class CompressionRecoveryTests: XCTestCase {
    func testCorruptSaveJournalBlocksAnotherSaveAndPreservesEvidence() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let original = Data("incomplete journal".utf8); let file = root.appendingPathComponent("job.json"); try original.write(to: file)
        let compressor = PhotoSweepCompression(directory: root)
        XCTAssertEqual(compressor.status()["phase"] as? String, "unknown")
        XCTAssertThrowsError(try compressor.start("any-asset", preset: "1080"))
        XCTAssertEqual(try Data(contentsOf: file), original)
    }
    func testInterruptedEncodingBecomesCancelledWithoutResuming() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let record = ["id": "job", "assetId": "original", "phase": "encoding"]
        try JSONSerialization.data(withJSONObject: record).write(to: root.appendingPathComponent("job.json"))
        let compressor = PhotoSweepCompression(directory: root)
        XCTAssertEqual(compressor.status()["phase"] as? String, "cancelled")
        XCTAssertEqual(compressor.status()["assetId"] as? String, "original")
        XCTAssertThrowsError(try compressor.save("job"))
    }
    func testUnknownSaveCannotCreateAnotherCopy() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let record = ["id": "job", "assetId": "original", "phase": "unknown"]
        try JSONSerialization.data(withJSONObject: record).write(to: root.appendingPathComponent("job.json"))
        let compressor = PhotoSweepCompression(directory: root)
        XCTAssertEqual(try compressor.save("job")["phase"] as? String, "unknown")
        XCTAssertThrowsError(try compressor.start("another", preset: "720"))
    }
}
