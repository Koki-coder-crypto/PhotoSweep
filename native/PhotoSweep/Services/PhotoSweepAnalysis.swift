import Foundation
import Photos
import UIKit
import CryptoKit

enum PhotoSweepAnalysis {
  static func allowed() -> Bool {
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    return status == .authorized || status == .limited
  }

  static func fingerprints(_ ids: [String]) -> [[String: Any]] {
    guard allowed() else { return [] }
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: Array(ids.prefix(24)), options: nil)
    let options = PHImageRequestOptions()
    options.isSynchronous = true
    options.isNetworkAccessAllowed = false
    // fastFormat can require a pre-existing thumbnail and return PhotoKit 3303
    // even while a local original is readable (fresh imports). Request a bounded
    // rendition generated from the local original; never fetch iCloud here.
    options.deliveryMode = .highQualityFormat
    options.resizeMode = .exact
    var result: [[String: Any]] = []
    assets.enumerateObjects { asset, _, _ in
      autoreleasepool {
        guard allowed() else { return }
        PHImageManager.default().requestImage(for: asset, targetSize: CGSize(width: 96, height: 96), contentMode: .aspectFit, options: options) { image, info in
          guard let cg = image?.cgImage, info?[PHImageErrorKey] == nil else { return }
          var pixels = [UInt8](repeating: 0, count: 72)
          let drawn = pixels.withUnsafeMutableBytes { bytes -> Bool in
            guard let context = CGContext(data: bytes.baseAddress, width: 9, height: 8, bitsPerComponent: 8, bytesPerRow: 9, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return false }
            context.interpolationQuality = .high
            context.draw(cg, in: CGRect(x: 0, y: 0, width: 9, height: 8))
            return true
          }
          guard drawn else { return }
          var hash: UInt64 = 0
          var contrast = 0
          for y in 0..<8 { for x in 0..<8 {
            let delta = Int(pixels[y * 9 + x]) - Int(pixels[y * 9 + x + 1])
            hash = (hash << 1) | (delta > 0 ? 1 : 0)
            contrast += abs(delta)
          } }
          // Low-information images cannot reliably support a similarity suggestion.
          guard contrast > 100 else { return }
          let resources = PHAssetResource.assetResources(for: asset)
          let exact = !asset.mediaSubtypes.contains(.photoLive) && resources.count == 1 && resources.first?.type == .photo
          result.append(["id": asset.localIdentifier, "hash": String(format: "%016llx", hash), "quality": contrast, "favorite": asset.isFavorite, "exactEligible": exact])
        }
      }
    }
    return allowed() ? result : []
  }

  static func digests(_ ids: [String]) -> [[String: String]] {
    guard allowed() else { return [] }
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: Array(ids.prefix(8)), options: nil)
    var result: [[String: String]] = []
    assets.enumerateObjects { asset, _, _ in
      autoreleasepool {
        guard allowed(), !asset.mediaSubtypes.contains(.photoLive) else { return }
        let resources = PHAssetResource.assetResources(for: asset)
        guard resources.count == 1, resources.first?.type == .photo else { return }
        let options = PHAssetResourceRequestOptions(); options.isNetworkAccessAllowed = false
        let semaphore = DispatchSemaphore(value: 0), lock = NSLock()
        var hasher = SHA256(), failed = false, active = true
        let request = PHAssetResourceManager.default().requestData(for: resources[0], options: options, dataReceivedHandler: { data in
          lock.lock(); defer { lock.unlock() }; if active { hasher.update(data: data) }
        }, completionHandler: { error in lock.lock(); failed = error != nil; lock.unlock(); semaphore.signal() })
        if semaphore.wait(timeout: .now() + 20) == .timedOut {
          lock.lock(); active = false; lock.unlock(); PHAssetResourceManager.default().cancelDataRequest(request); return
        }
        lock.lock(); let success = !failed; let digest = hasher.finalize().map { String(format: "%02x", $0) }.joined(); lock.unlock()
        if success { result.append(["id": asset.localIdentifier, "digest": digest]) }
      }
    }
    return allowed() ? result : []
  }
}
