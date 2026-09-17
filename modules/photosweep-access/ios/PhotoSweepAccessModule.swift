import ExpoModulesCore
import Photos
import StoreKit

public class PhotoSweepAccessModule: Module {
  private let analysisQueue = DispatchQueue(label: "photosweep.analysis", qos: .utility)
  public func definition() -> ModuleDefinition {
    Name("PhotoSweepAccess")
    AsyncFunction("fingerprints") { (ids: [String]) -> [[String: Any]] in
      PhotoSweepAnalysis.fingerprints(ids)
    }.runOnQueue(analysisQueue)
    AsyncFunction("contentDigests") { (ids: [String]) -> [[String: String]] in
      PhotoSweepAnalysis.digests(ids)
    }.runOnQueue(analysisQueue)
    AsyncFunction("canPurchase") { () -> Bool in AppStore.canMakePayments }
    AsyncFunction("deleteRequested") { (ids: [String], promise: Promise) in
      let unique = Array(Set(ids))
      guard !unique.isEmpty else { promise.resolve("unknown"); return }
      let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
      guard status == .authorized || status == .limited else { promise.resolve("unknown"); return }
      let assets = PHAsset.fetchAssets(withLocalIdentifiers: unique, options: nil)
      guard assets.count == unique.count else { promise.resolve("unknown"); return }
      PHPhotoLibrary.shared().performChanges {
        PHAssetChangeRequest.deleteAssets(assets)
      } completionHandler: { success, error in
        if success { promise.resolve("confirmed"); return }
        if let error = error as NSError?, error.domain == PHPhotosErrorDomain,
           error.code == PHPhotosError.Code.userCancelled.rawValue {
          promise.resolve("cancelled")
        } else { promise.resolve("unknown") }
      }
    }
    AsyncFunction("permission") { () -> String in
      switch PHPhotoLibrary.authorizationStatus(for: .readWrite) {
      case .authorized: return "full"
      case .limited: return "limited"
      case .denied: return "denied"
      case .restricted: return "restricted"
      case .notDetermined: return "unknown"
      @unknown default: return "unknown"
      }
    }
    AsyncFunction("inspect") { (ids: [String]) -> [String: [String]] in
      let before = PHPhotoLibrary.authorizationStatus(for: .readWrite)
      guard before == .authorized || before == .limited else {
        return ["present": [], "missing": [], "inaccessible": ids]
      }
      let assets = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
      var found = Set<String>()
      assets.enumerateObjects { asset, _, _ in found.insert(asset.localIdentifier) }
      let after = PHPhotoLibrary.authorizationStatus(for: .readWrite)
      guard before == after else { return ["present": [], "missing": [], "inaccessible": ids] }
      let absent = ids.filter { !found.contains($0) }
      return ["present": ids.filter { found.contains($0) }, "missing": after == .authorized ? absent : [], "inaccessible": after == .authorized ? [] : absent]
    }
  }
}
