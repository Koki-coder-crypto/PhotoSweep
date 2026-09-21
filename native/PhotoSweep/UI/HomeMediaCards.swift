import SwiftUI
import Photos
import AVFoundation

struct HomeMediaSummary {
    var ids: [String] = []
    var count = 0
    var videoID: String?
    static func build(photos: [MediaItem], groups: [PhotoGroup], sizes: [String: AssetSize]) -> [Category: HomeMediaSummary] {
        var seen = Set<String>()
        let photos = photos.filter { seen.insert($0.id).inserted }
        let byID = Dictionary(uniqueKeysWithValues: photos.map { ($0.id, $0) })
        var result: [Category: HomeMediaSummary] = [:]
        for category in [Category.videos, .recordings, .compression, .screenshots, .all] {
            var items = photos.filter { item in
                switch category {
                case .videos, .compression: return item.kind == .video
                case .recordings: return item.kind == .video && item.recording
                case .screenshots: return item.kind == .photo && item.screenshot
                case .all: return item.kind == .photo
                default: return false
                }
            }
            if [.videos, .recordings, .compression].contains(category) {
                items.sort {
                    let a = sizes[$0.id]?.bytes ?? -1, b = sizes[$1.id]?.bytes ?? -1
                    return a == b ? $0.createdAt > $1.createdAt : a > b
                }
            }
            result[category] = HomeMediaSummary(ids: Array(items.prefix(3)).map(\.id), count: items.count,
                                               videoID: items.first.flatMap { $0.kind == .video ? $0.id : nil })
        }
        for category in [Category.similar, .duplicate] {
            let matches = groups.filter { $0.kind == category.rawValue }
            let validGroups = matches.map { group in
                var seen = Set<String>()
                return group.ids.filter { byID[$0]?.kind == .photo && seen.insert($0).inserted }
            }.filter { $0.count >= 2 }
            result[category] = HomeMediaSummary(ids: Array((validGroups.first ?? []).prefix(3)), count: Set(validGroups.flatMap { $0 }).count)
        }
        return result
    }
}

struct HomeCardFrames: PreferenceKey {
    static var defaultValue: [Category: CGRect] = [:]
    static func reduce(value: inout [Category: CGRect], nextValue: () -> [Category: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}

// One owner / one player for the entire home. Requests never fetch iCloud originals.
@MainActor final class HomePreviewPlayer: ObservableObject {
    @Published private(set) var player: AVPlayer?
    @Published private(set) var category: Category?
    private var assetID: String?
    private var request: PHImageRequestID?
    private var generation = UUID()
    private var endObserver: NSObjectProtocol?
    private let manager = PHImageManager()

    static func visibleCategory(frames: [Category: CGRect], height: CGFloat,
                                summaries: [Category: HomeMediaSummary]) -> Category? {
        frames.filter { entry in
            let rect = entry.value
            let visible = max(0, min(rect.maxY, height) - max(rect.minY, 0))
            return summaries[entry.key]?.videoID != nil && rect.height > 0 && visible / rect.height >= 0.65
        }.min {
            let a = abs($0.value.midY - height / 2), b = abs($1.value.midY - height / 2)
            return a == b ? $0.key.rawValue < $1.key.rawValue : a < b
        }?.key
    }
    func stop() {
        guard category != nil || player != nil || request != nil else { return }
        generation = UUID()
        if let request { manager.cancelImageRequest(request) }
        request = nil
        if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
        endObserver = nil
        player?.pause(); player?.replaceCurrentItem(with: nil); player = nil
        category = nil; assetID = nil
    }
    func show(_ next: Category?, summaries: [Category: HomeMediaSummary]) {
        guard let next, let id = summaries[next]?.videoID else { stop(); return }
        guard category != next || assetID != id else { return }
        stop(); category = next; assetID = id
        let token = generation
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { return }
        let options = PHVideoRequestOptions()
        options.isNetworkAccessAllowed = false
        options.deliveryMode = .fastFormat
        request = manager.requestPlayerItem(forVideo: asset, options: options) { [weak self] item, _ in
            Task { @MainActor [weak self] in
                guard let self, self.generation == token, let item else { return }
                self.request = nil
                item.preferredMaximumResolution = CGSize(width: 720, height: 720)
                item.preferredPeakBitRate = 1_000_000
                item.forwardPlaybackEndTime = CMTime(seconds: min(3, max(0.1, asset.duration)), preferredTimescale: 600)
                let player = AVPlayer(playerItem: item)
                player.isMuted = true; player.actionAtItemEnd = .pause
                self.player = player
                self.endObserver = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self, weak player] _ in
                    Task { @MainActor in
                        guard let self, self.generation == token else { return }
                        player?.seek(to: .zero, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self, weak player] finished in
                            Task { @MainActor in
                                guard finished, self?.generation == token else { return }; player?.play()
                            }
                        }
                    }
                }
                player.play()
            }
        }
    }
}

private final class PreviewSurface: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var videoLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}
private struct InlinePreview: UIViewRepresentable {
    var player: AVPlayer
    func makeUIView(context: Context) -> PreviewSurface { let view = PreviewSurface(); view.videoLayer.videoGravity = .resizeAspectFill; return view }
    func updateUIView(_ view: PreviewSurface, context: Context) { view.videoLayer.player = player }
    static func dismantleUIView(_ view: PreviewSurface, coordinator: ()) { view.videoLayer.player = nil }
}

struct HomeMediaCard: View {
    var category: Category
    var summary: HomeMediaSummary
    var pending: Bool
    @ObservedObject var preview: HomePreviewPlayer
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Label(L(category.title), systemImage: category.symbol).font(.headline)
                Spacer(minLength: 8)
                if category == .compression { Text("Pro").font(.caption.bold()).foregroundStyle(Color.accentColor) }
                Image(systemName: "chevron.right").font(.caption.bold()).foregroundStyle(.secondary)
            }
            if summary.ids.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: category.symbol).font(.title).foregroundStyle(Color.accentColor.opacity(0.65))
                    Text(L(pending ? "analysis.running" : "home.previewEmpty")).font(.subheadline).foregroundStyle(.secondary)
                }.frame(maxWidth: .infinity).frame(height: 120).background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
            } else {
                HStack(spacing: 6) {
                    ForEach(Array(summary.ids.enumerated()), id: \.element) { index, id in
                        ZStack(alignment: .bottomLeading) {
                            AssetThumbnail(id: id)
                            if index == 0, preview.category == category, let player = preview.player {
                                InlinePreview(player: player).allowsHitTesting(false)
                            }
                            if index == 0, summary.videoID != nil, preview.category == category, preview.player != nil {
                                Label(L("home.silentPreview"), systemImage: "speaker.slash.fill")
                                    .font(.caption2.bold()).padding(7).foregroundStyle(.white)
                                    .background(.black.opacity(0.55), in: Capsule()).padding(8)
                            }
                        }.frame(maxWidth: .infinity).frame(height: category == .videos ? 172 : 136)
                            .clipShape(RoundedRectangle(cornerRadius: 16)).accessibilityHidden(true)
                    }
                }
            }
            HStack {
                Text(pending ? L("analysis.running") : String(format: L("count.items"), summary.count))
                    .font(.subheadline.weight(.semibold)).monospacedDigit()
                Spacer()
                Text(L("home.choose")).font(.subheadline).foregroundStyle(Color.accentColor)
            }
        }.padding(16).background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 22))
            .accessibilityElement(children: .combine)
            .background(GeometryReader { geo in Color.clear.preference(key: HomeCardFrames.self, value: [category: geo.frame(in: .named("homeViewport"))]) })
    }
}
