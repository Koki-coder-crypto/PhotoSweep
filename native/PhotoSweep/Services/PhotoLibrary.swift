import Photos
import UIKit
import AVFoundation

protocol PhotoRepository {
    func requestPermission() async -> PHAuthorizationStatus
    func page(offset: Int, count: Int) async throws -> [MediaItem]
    func delete(_ ids: [String]) async -> String
}

final class PhotoLibrary: NSObject, PhotoRepository, PHPhotoLibraryChangeObserver {
    let images = PHCachingImageManager()
    var changed: (() -> Void)?
    private let queue = DispatchQueue(label: "PhotoSweep.library", qos: .userInitiated)
    private var observing = false
    override init() { super.init() }
    deinit { if observing { PHPhotoLibrary.shared().unregisterChangeObserver(self) } }
    // PhotoKit observation starts only after access is granted, never during the
    // practice introduction. Refresh this when returning from Settings as well.
    @MainActor func updateObservation() {
        if accessible && !observing {
            PHPhotoLibrary.shared().register(self); observing = true
        } else if !accessible && observing {
            PHPhotoLibrary.shared().unregisterChangeObserver(self); observing = false
        }
    }
    func photoLibraryDidChange(_ changeInstance: PHChange) { DispatchQueue.main.async { self.changed?() } }
    var permission: PHAuthorizationStatus { PHPhotoLibrary.authorizationStatus(for: .readWrite) }
    var accessible: Bool { permission == .authorized || permission == .limited }
    func requestPermission() async -> PHAuthorizationStatus { await PHPhotoLibrary.requestAuthorization(for: .readWrite) }
    func page(offset: Int, count: Int = 250) async throws -> [MediaItem] {
        await withCheckedContinuation { continuation in queue.async {
            guard self.accessible else { continuation.resume(returning: []); return }
            let options = PHFetchOptions(); options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
            options.predicate = NSPredicate(format: "mediaType == %d OR mediaType == %d", PHAssetMediaType.image.rawValue, PHAssetMediaType.video.rawValue)
            let assets = PHAsset.fetchAssets(with: options)
            var recordings = Set<String>()
            if let collection = PHAssetCollection.fetchAssetCollections(with: .smartAlbum, subtype: .smartAlbumScreenRecordings, options: nil).firstObject {
                PHAsset.fetchAssets(in: collection, options: nil).enumerateObjects { asset, _, _ in recordings.insert(asset.localIdentifier) }
            }
            var items: [MediaItem] = []
            if offset < assets.count { for index in offset..<min(assets.count, offset + count) {
                let asset = assets.object(at: index)
                items.append(MediaItem(id: asset.localIdentifier, kind: asset.mediaType == .video ? .video : .photo, createdAt: (asset.creationDate?.timeIntervalSince1970 ?? 0) * 1000,
                                       width: asset.pixelWidth, height: asset.pixelHeight, duration: asset.duration, screenshot: asset.mediaSubtypes.contains(.photoScreenshot),
                                       recording: recordings.contains(asset.localIdentifier), favorite: asset.isFavorite, modifiedAt: (asset.modificationDate?.timeIntervalSince1970 ?? 0) * 1000))
            } }
            continuation.resume(returning: items)
        } }
    }
    func delete(_ ids: [String]) async -> String {
        guard accessible else { return "unknown" }
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        guard assets.count == Set(ids).count else { return "unknown" }
        return await withCheckedContinuation { continuation in
            PHPhotoLibrary.shared().performChanges({ PHAssetChangeRequest.deleteAssets(assets) }) { success, error in
                let ns = error as NSError?
                continuation.resume(returning: success ? "confirmed" : (ns?.domain == PHPhotosErrorDomain && ns?.code == PHPhotosError.userCancelled.rawValue ? "cancelled" : "unknown"))
            }
        }
    }
    func missing(_ ids: [String]) -> [String]? {
        guard permission == .authorized else { return nil }
        var found = Set<String>()
        PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil).enumerateObjects { asset, _, _ in found.insert(asset.localIdentifier) }
        guard permission == .authorized else { return nil }; return ids.filter { !found.contains($0) }
    }
    func image(_ id: String, size: CGSize, network: Bool = false, completion: @escaping (UIImage?) -> Void) -> PHImageRequestID? {
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { completion(nil); return nil }
        let options = PHImageRequestOptions(); options.isNetworkAccessAllowed = network; options.deliveryMode = .highQualityFormat
        return images.requestImage(for: asset, targetSize: size, contentMode: .aspectFit, options: options) { image, _ in DispatchQueue.main.async { completion(image) } }
    }
    func prefetch(_ ids: [String]) {
        var assets: [PHAsset] = []; PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil).enumerateObjects { asset, _, _ in assets.append(asset) }
        images.startCachingImages(for: assets, targetSize: CGSize(width: 1000, height: 1400), contentMode: .aspectFit, options: nil)
    }
    func video(_ id: String) async -> AVPlayerItem? {
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { return nil }
        let options = PHVideoRequestOptions(); options.isNetworkAccessAllowed = true
        return await withCheckedContinuation { continuation in images.requestPlayerItem(forVideo: asset, options: options) { item, _ in continuation.resume(returning: item) } }
    }
    func size(_ id: String) async -> AssetSize? {
        await withCheckedContinuation { continuation in queue.async {
            let raw = PhotoSweepMedia.size(id)
            continuation.resume(returning: (try? JSONSerialization.data(withJSONObject: raw)).flatMap { try? JSONDecoder().decode(AssetSize.self, from: $0) })
        } }
    }
}
