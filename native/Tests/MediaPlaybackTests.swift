import XCTest
import AVFoundation
import SwiftUI
@testable import PhotoSweep

final class MediaPlaybackTests: XCTestCase {
    @MainActor func testPreviewStartsMutedWithoutTapAndReleasesVideoWhenStopped() async throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".mp4")
        defer { try? FileManager.default.removeItem(at: url) }
        let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: 64, AVVideoHeightKey: 64])
        let adapter = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: 64, kCVPixelBufferHeightKey as String: 64])
        writer.add(input); XCTAssertTrue(writer.startWriting()); writer.startSession(atSourceTime: .zero)
        var buffer: CVPixelBuffer?
        XCTAssertEqual(CVPixelBufferCreate(kCFAllocatorDefault, 64, 64, kCVPixelFormatType_32ARGB, nil, &buffer), kCVReturnSuccess)
        let pixels = try XCTUnwrap(buffer)
        CVPixelBufferLockBaseAddress(pixels, [])
        memset(CVPixelBufferGetBaseAddress(pixels), 100, CVPixelBufferGetDataSize(pixels))
        CVPixelBufferUnlockBaseAddress(pixels, [])
        for frame in 0..<30 {
            let deadline = ProcessInfo.processInfo.systemUptime + 5
            while !input.isReadyForMoreMediaData && ProcessInfo.processInfo.systemUptime < deadline { try await Task.sleep(nanoseconds: 10_000_000) }
            XCTAssertTrue(input.isReadyForMoreMediaData)
            XCTAssertTrue(adapter.append(pixels, withPresentationTime: CMTime(value: Int64(frame), timescale: 30)))
        }
        input.markAsFinished(); await writer.finishWriting(); XCTAssertEqual(writer.status, .completed)
        let preview = MediaPreviewPlayer()
        preview.show(id: nil, url: url, full: false)
        let player = try XCTUnwrap(preview.player)
        let deadline = ProcessInfo.processInfo.systemUptime + 5
        while (!player.currentTime().seconds.isFinite || player.currentTime().seconds < 0.05) && ProcessInfo.processInfo.systemUptime < deadline { try await Task.sleep(nanoseconds: 20_000_000) }
        XCTAssertGreaterThan(player.currentTime().seconds, 0.04)
        XCTAssertTrue(player.isMuted)
        preview.stop()
        XCTAssertNil(preview.player)
        XCTAssertNil(player.currentItem)
        XCTAssertEqual(player.rate, 0)
    }

    /// Layout evidence uses declared test data and bundled practice photos, never claimed as real user results.
    @MainActor func testSamplePhotosAndResultLayoutEvidence() throws {
        XCTAssertNotNil(UIImage(named: "PracticeBeach"))
        XCTAssertNotNil(UIImage(named: "PracticeCafe"))
        let samples = ImageRenderer(content: HStack(spacing: 8) {
            ForEach(0..<3) { SampleCard(index: $0).frame(width: 105, height: 180) }
        }.padding(20))
        attach(try XCTUnwrap(samples.uiImage), name: "practice-photos")
        let outcome = Outcome(id: "fixture", at: 0, photoCount: 8, videoCount: 2, knownBytes: 185_000_000, unknownCount: 0, estimated: false, freeBefore: 1_000_000_000, freeAfter: 1_000_000_000)
        let result = ImageRenderer(content: VStack(spacing: 20) { DeletionResultCard(outcome: outcome) }.padding(20).frame(width: 390).background(Color(uiColor: .systemGroupedBackground)))
        attach(try XCTUnwrap(result.uiImage), name: "deletion-result-fixture")
    }
    private func attach(_ image: UIImage, name: String) {
        let attachment = XCTAttachment(image: image); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
