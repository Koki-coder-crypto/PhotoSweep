import SwiftUI
import Photos
import AVKit

private struct PreviewPlaybackAllowedKey: EnvironmentKey { static let defaultValue = true }
extension EnvironmentValues {
    var previewPlaybackAllowed: Bool {
        get { self[PreviewPlaybackAllowedKey.self] }
        set { self[PreviewPlaybackAllowedKey.self] = newValue }
    }
}

enum MediaVisibility {
    static func isVisible(_ frame: CGRect, in viewport: CGRect) -> Bool {
        guard frame.width > 0, frame.height > 0 else { return false }
        let intersection = frame.intersection(viewport)
        return !intersection.isNull && intersection.width * intersection.height / (frame.width * frame.height) >= 0.35
    }
}

@MainActor final class MediaPreviewPlayer: ObservableObject {
    @Published private(set) var player: AVPlayer?
    @Published private(set) var failed = false
    @Published var muted = true { didSet { player?.isMuted = muted } }
    private let manager = PHImageManager()
    private var request: PHImageRequestID?
    private var generation = UUID()
    private var source: String?
    private var endObserver: NSObjectProtocol?

    func stop() {
        generation = UUID()
        if let request { manager.cancelImageRequest(request) }; request = nil
        if let endObserver { NotificationCenter.default.removeObserver(endObserver) }; endObserver = nil
        player?.pause(); player?.replaceCurrentItem(with: nil); player = nil; source = nil; failed = false
    }
    func show(id: String?, url: URL?, full: Bool) {
        guard let key = url?.absoluteString ?? id else { stop(); return }
        guard source != key else { return }
        stop(); source = key; let token = generation
        if let url { install(AVPlayerItem(url: url), full: full, token: token); return }
        guard let id, let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { failed = true; return }
        let options = PHVideoRequestOptions(); options.isNetworkAccessAllowed = true
        options.deliveryMode = full ? .automatic : .fastFormat
        request = manager.requestPlayerItem(forVideo: asset, options: options) { [weak self] item, _ in
            Task { @MainActor [weak self] in
                guard let self, self.generation == token else { return }; self.request = nil
                guard let item else { self.failed = true; return }
                self.install(item, full: full, token: token)
            }
        }
    }
    private func install(_ item: AVPlayerItem, full: Bool, token: UUID) {
        if !full {
            item.preferredMaximumResolution = CGSize(width: 720, height: 720)
            item.preferredPeakBitRate = 1_000_000
            let duration = CMTimeGetSeconds(item.asset.duration)
            item.forwardPlaybackEndTime = CMTime(seconds: duration.isFinite ? min(3, max(0.1, duration)) : 3, preferredTimescale: 600)
        }
        let player = AVPlayer(playerItem: item); player.isMuted = muted; player.actionAtItemEnd = .pause
        self.player = player
        endObserver = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self, weak player] _ in
            Task { @MainActor in
                guard self?.generation == token else { return }
                player?.seek(to: .zero) { [weak self, weak player] finished in
                    Task { @MainActor in guard finished, self?.generation == token else { return }; player?.play() }
                }
            }
        }
        player.play()
    }
}

private final class PreviewSurface: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var videoLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    private var observation: NSKeyValueObservation?
    func setPlayer(_ player: AVPlayer?, fit: Bool) {
        videoLayer.videoGravity = fit ? .resizeAspect : .resizeAspectFill
        guard videoLayer.player !== player else { return }
        observation = nil; videoLayer.player = player
        observation = videoLayer.observe(\.isReadyForDisplay, options: [.initial, .new]) { layer, _ in
            DispatchQueue.main.async { layer.opacity = layer.isReadyForDisplay ? 1 : 0 }
        }
    }
}
private struct InlinePreview: UIViewRepresentable {
    var player: AVPlayer; var fit: Bool
    func makeUIView(context: Context) -> PreviewSurface { PreviewSurface() }
    func updateUIView(_ view: PreviewSurface, context: Context) { view.setPlayer(player, fit: fit) }
    static func dismantleUIView(_ view: PreviewSurface, coordinator: ()) { view.setPlayer(nil, fit: false) }
}

/// Each actually visible video owns a lightweight muted preview; offscreen requests and players stop.
struct AutoPlayingVideo: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.scenePhase) private var phase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.previewPlaybackAllowed) private var allowed
    @StateObject private var preview = MediaPreviewPlayer()
    @State private var visible = false
    @State private var appeared = false
    @State private var ownerTab = 0
    var id: String?
    var url: URL? = nil
    var fit = false
    var controls = false

    private var active: Bool {
        appeared && visible && phase == .active && allowed && app.tab == ownerTab
            && (controls || (!reduceMotion && !app.state.settings.reduceMotion))
    }
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if let id { AssetThumbnail(id: id, fit: fit) }
            else { Color(uiColor: .tertiarySystemFill); if preview.player == nil && !preview.failed { ProgressView() } }
            if let player = preview.player {
                if controls { VideoPlayer(player: player) }
                else { InlinePreview(player: player, fit: fit).allowsHitTesting(false) }
                if controls {
                    Button { preview.muted.toggle() } label: {
                        Image(systemName: preview.muted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                            .frame(width: 44, height: 44).background(.regularMaterial, in: Circle())
                    }.accessibilityLabel(L(preview.muted ? "media.unmute" : "media.mute")).padding(8)
                }
            }
            if preview.failed && controls {
                Button(L("retry")) { preview.stop(); update() }.padding(12).background(.regularMaterial, in: Capsule()).padding()
            }
        }
        .background(GeometryReader { geometry in
            Color.clear.onAppear { visible = MediaVisibility.isVisible(geometry.frame(in: .global), in: UIScreen.main.bounds) }
                .onChange(of: geometry.frame(in: .global)) { visible = MediaVisibility.isVisible($0, in: UIScreen.main.bounds) }
        })
        .onAppear { ownerTab = app.tab; appeared = true; update() }
        .onDisappear { appeared = false; preview.stop() }
        .onChange(of: active) { _ in update() }
        .onChange(of: id) { _ in update() }
        .onChange(of: url) { _ in update() }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didReceiveMemoryWarningNotification)) { _ in preview.stop() }
        .accessibilityLabel(L("media.videoPreview"))
    }
    private func update() { if active { preview.show(id: id, url: url, full: controls) } else { preview.stop() } }
}

struct MediaThumbnail: View {
    @EnvironmentObject private var app: AppModel
    var id: String; var fit = false
    var body: some View {
        if app.mediaIndex.byID[id]?.kind == .video || app.state.kind(id) == .video { AutoPlayingVideo(id: id, fit: fit) }
        else { AssetThumbnail(id: id, fit: fit) }
    }
}
