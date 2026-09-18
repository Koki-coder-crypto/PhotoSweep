import Foundation
import Photos
import AVFoundation
import UIKit

// Only public PhotoKit APIs. Network downloads are disabled during size discovery.
enum PhotoSweepMedia {
  static func size(_ id: String) -> [String: Any] {
    guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else {
      return ["bytes": NSNull(), "quality": "unknown", "basis": "unknown", "modifiedAt": 0]
    }
    let modified = (asset.modificationDate?.timeIntervalSince1970 ?? 0) * 1000
    let unknown: [String: Any] = ["bytes": NSNull(), "quality": "unknown", "basis": "unknown", "modifiedAt": modified]
    let all = PHAssetResource.assetResources(for: asset)
    // Edited and multi-representation media are not counted twice or guessed.
    if all.contains(where: { $0.type == .adjustmentData || $0.type == .alternatePhoto }) { return unknown }
    let resources = all.filter { $0.type == .photo || $0.type == .video || $0.type == .pairedVideo }
    if resources.isEmpty { return unknown }
    var total: Int64 = 0
    for resource in resources {
      let options = PHAssetResourceRequestOptions(); options.isNetworkAccessAllowed = false
      let finished = DispatchSemaphore(value: 0), lock = NSLock()
      var bytes: Int64 = 0, failed = false, active = true
      let request = PHAssetResourceManager.default().requestData(for: resource, options: options, dataReceivedHandler: { data in
        lock.lock(); defer { lock.unlock() }; if active { bytes += Int64(data.count) }
      }, completionHandler: { error in
        lock.lock(); failed = error != nil; lock.unlock(); finished.signal()
      })
      if finished.wait(timeout: .now() + 20) == .timedOut {
        lock.lock(); active = false; lock.unlock()
        PHAssetResourceManager.default().cancelDataRequest(request); return unknown
      }
      lock.lock(); let value = bytes, error = failed; lock.unlock()
      if error { return unknown }; total += value
    }
    return ["bytes": total, "quality": "measured-resource", "basis": "original-resource", "modifiedAt": modified]
  }
}
