import Foundation
import AVFoundation
import Photos
import UIKit

// One durable job. No original is ever deleted here. A saving/unknown job cannot be retried as a new save.
final class PhotoSweepCompression {
  private let lock = NSRecursiveLock()
  private var job: [String: Any] = ["id": "", "assetId": "", "phase": "idle"]
  private var exporter: AVAssetExportSession?
  private var videoRequest: PHImageRequestID?
  private let directory: URL
  private let journal: URL
  private var observer: NSObjectProtocol?
  init(directory override: URL? = nil) {
    directory = override ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("PhotoSweepCompression", isDirectory: true)
    journal = directory.appendingPathComponent("job.json")
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    if FileManager.default.fileExists(atPath: journal.path) {
      if let data = try? Data(contentsOf: journal), let saved = try? JSONSerialization.jsonObject(with: data) as? [String: Any], saved["phase"] is String, saved["id"] is String {
        job = saved
        if ["preparing", "encoding"].contains(job["phase"] as? String ?? "") { job["phase"] = "cancelled"; job["message"] = L("compression.error1") }
      } else { job = ["id": "unreadable", "assetId": "", "phase": "unknown", "message": L("compression.error2")] }
    }
    observer = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil) { [weak self] _ in self?.cancel() }
  }
  deinit { if let observer = observer { NotificationCenter.default.removeObserver(observer) } }
  private func persist() throws { try JSONSerialization.data(withJSONObject: job).write(to: journal, options: .atomic) }
  private func failure(_ message: String) -> NSError { NSError(domain: "PhotoSweepCompression", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
  func status() -> [String: Any] {
    lock.lock(); defer { lock.unlock() }
    if job["phase"] as? String == "encoding", let exporter = exporter { job["progress"] = Double(exporter.progress) }
    if ["saving", "unknown"].contains(job["phase"] as? String ?? ""), let id = job["savedId"] as? String,
       PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject != nil {
      job["phase"] = "saved"; try? persist()
    }
    if job["phase"] as? String == "saving", Date().timeIntervalSince1970 - (job["saveRequestedAt"] as? Double ?? 0) > 30 {
      job["phase"] = "unknown"; job["message"] = L("compression.error2"); try? persist()
    }
    var localized = job
    if let message = job["message"] as? String, let path = Bundle.main.path(forResource: "ja", ofType: "lproj"), let japanese = Bundle(path: path) {
      for index in 1...16 {
        let key = "compression.error\(index)"
        if japanese.localizedString(forKey: key, value: nil, table: nil) == message { localized["message"] = L(key); break }
      }
    }
    return localized
  }
  func start(_ assetId: String, preset: String) throws -> [String: Any] {
    lock.lock(); defer { lock.unlock() }
    guard !["preparing", "encoding", "saving", "unknown"].contains(job["phase"] as? String ?? "") else { throw failure(L("compression.error3")) }
    if let path = job["outputUri"] as? String, let url = URL(string: path), url.deletingLastPathComponent() == directory { try? FileManager.default.removeItem(at: url) }
    let id = UUID().uuidString
    job = ["id": id, "assetId": assetId, "phase": "preparing", "progress": 0]
    try persist()
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.prepare(id, assetId: assetId, preset: preset) }
    return job
  }
  private func update(_ id: String, _ values: [String: Any]) {
    lock.lock(); defer { lock.unlock() }
    guard job["id"] as? String == id, job["phase"] as? String != "cancelled" else { return }
    job.merge(values) { _, new in new }; try? persist()
  }
  private func prepare(_ id: String, assetId: String, preset: String) {
    let available = (try? FileManager.default.attributesOfFileSystem(forPath: directory.path)[.systemFreeSize] as? NSNumber)?.int64Value ?? 0
    guard available > 500_000_000 else { update(id, ["phase": "failed", "message": L("compression.error4")]); return }
    guard ProcessInfo.processInfo.thermalState != .critical && ProcessInfo.processInfo.thermalState != .serious else { update(id, ["phase": "failed", "message": L("compression.error5")]); return }
    guard let photo = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil).firstObject, photo.mediaType == .video else { update(id, ["phase": "failed", "message": L("compression.error6")]); return }
    let resources = PHAssetResource.assetResources(for: photo)
    guard !photo.mediaSubtypes.contains(.videoCinematic), !photo.mediaSubtypes.contains(.videoHighFrameRate), !photo.mediaSubtypes.contains(.videoTimelapse),
          !resources.contains(where: { $0.type == .adjustmentData }) else { update(id, ["phase": "failed", "message": L("compression.error7")]); return }
    let options = PHVideoRequestOptions(); options.version = .original; options.isNetworkAccessAllowed = true; options.deliveryMode = .highQualityFormat
    options.progressHandler = { [weak self] progress, _, _, _ in self?.update(id, ["progress": progress]) }
    lock.lock()
    guard job["id"] as? String == id, job["phase"] as? String == "preparing" else { lock.unlock(); return }
    videoRequest = PHImageManager.default().requestAVAsset(forVideo: photo, options: options) { [weak self] asset, _, _ in
      DispatchQueue.global(qos: .userInitiated).async { self?.encode(id, asset: asset, preset: preset) }
    }
    lock.unlock()
  }
  private func encode(_ id: String, asset: AVAsset?, preset: String) {
    guard let input = asset as? AVURLAsset else { update(id, ["phase": "failed", "message": L("compression.error8")]); return }
    let tracks = input.tracks(withMediaType: .video)
    guard tracks.count == 1, let track = tracks.first,
          !track.hasMediaCharacteristic(.containsHDRVideo), input.isPlayable else { update(id, ["phase": "failed", "message": L("compression.error9")]); return }
    let inputBytes = (try? input.url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
    guard inputBytes > 0 else { update(id, ["phase": "failed", "message": L("compression.error10")]); return }
    let free = (try? FileManager.default.attributesOfFileSystem(forPath: directory.path)[.systemFreeSize] as? NSNumber)?.int64Value ?? 0
    guard free > Int64(inputBytes) * 2 + 200_000_000 else { update(id, ["phase": "failed", "message": L("compression.error11")]); return }
    let output = directory.appendingPathComponent("\(id).mp4")
    guard let session = AVAssetExportSession(asset: input, presetName: preset == "720" ? AVAssetExportPreset1280x720 : AVAssetExportPreset1920x1080), session.supportedFileTypes.contains(.mp4) else { update(id, ["phase": "failed", "message": L("compression.error12")]); return }
    session.outputURL = output; session.outputFileType = .mp4
    lock.lock()
    guard job["id"] as? String == id, job["phase"] as? String == "preparing" else { lock.unlock(); return }
    exporter = session; job.merge(["phase": "encoding", "inputUri": input.url.absoluteString, "outputUri": output.absoluteString, "inputBytes": inputBytes, "progress": 0]) { _, new in new }; try? persist()
    session.exportAsynchronously { [weak self] in
      guard let self = self else { return }
      if session.status == .cancelled { return }
      guard session.status == .completed else { self.update(id, ["phase": "failed", "message": session.error?.localizedDescription ?? L("compression.error13")]); return }
      let result = AVURLAsset(url: output), resultTracks = result.tracks(withMediaType: .video)
      let bytes = (try? output.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
      let beforeRect = CGRect(origin: .zero, size: track.naturalSize).applying(track.preferredTransform)
      let outputTrack = resultTracks.first
      let afterRect = outputTrack.map { CGRect(origin: .zero, size: $0.naturalSize).applying($0.preferredTransform) } ?? .zero
      let ratio = abs(beforeRect.width / max(1, beforeRect.height)), newRatio = abs(afterRect.width / max(1, afterRect.height))
      guard result.isPlayable, resultTracks.count == 1, bytes > 0,
            abs(CMTimeGetSeconds(result.duration) - CMTimeGetSeconds(input.duration)) < 0.5,
            abs(ratio - newRatio) < 0.03,
            result.tracks(withMediaType: .audio).isEmpty == input.tracks(withMediaType: .audio).isEmpty else {
        self.update(id, ["phase": "failed", "message": L("compression.error14")]); return
      }
      self.update(id, ["phase": bytes < inputBytes ? "ready" : "not-smaller", "outputBytes": bytes, "progress": 1])
    }
    lock.unlock()
  }
  func cancel() {
    lock.lock(); defer { lock.unlock() }
    guard ["preparing", "encoding"].contains(job["phase"] as? String ?? "") else { return }
    job["phase"] = "cancelled"; job["message"] = L("compression.error1"); try? persist()
    if let request = videoRequest { PHImageManager.default().cancelImageRequest(request) }
    exporter?.cancelExport()
  }
  func save(_ id: String) throws -> [String: Any] {
    lock.lock(); defer { lock.unlock() }
    guard job["id"] as? String == id else { throw failure(L("compression.error15")) }
    if ["saving", "unknown", "saved"].contains(job["phase"] as? String ?? "") { return status() }
    guard job["phase"] as? String == "ready", let path = job["outputUri"] as? String, let url = URL(string: path), FileManager.default.fileExists(atPath: url.path) else { throw failure(L("compression.error16")) }
    job["phase"] = "saving"; job["saveRequestedAt"] = Date().timeIntervalSince1970; try persist()
    PHPhotoLibrary.shared().performChanges({
      guard let request = PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url) else { return }
      self.lock.lock(); defer { self.lock.unlock() }
      self.job["savedId"] = request.placeholderForCreatedAsset?.localIdentifier
      // Persist the placeholder before completion so a relaunch never creates another copy.
      try? self.persist()
    }, completionHandler: { success, error in
      self.update(id, ["phase": success ? "saving" : "unknown", "message": error?.localizedDescription ?? ""])
      _ = self.status()
    })
    return job
  }
}
