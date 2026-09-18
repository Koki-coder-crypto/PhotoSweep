import SwiftUI
import Photos
import AVKit

let coral = Color(red: 0.96, green: 0.38, blue: 0.36)
struct ActionButton: View {
    var title: String; var symbol: String? = nil; var action: () -> Void
    var body: some View {
        Button(action: action) { HStack { if let symbol { Image(systemName: symbol) }; Text(L(title)).fontWeight(.semibold) }.frame(maxWidth: .infinity, minHeight: 44) }
            .buttonStyle(.borderedProminent).controlSize(.large)
    }
}
struct Panel<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View { VStack(alignment: .leading, spacing: 16) { content }.padding(16).frame(maxWidth: .infinity, alignment: .leading).background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 20)) }
}
struct EmptyViewState: View {
    var title: String; var detail: String; var icon = "photo.on.rectangle.angled"
    var body: some View { VStack(spacing: 16) { Image(systemName: icon).font(.system(size: 48)).foregroundStyle(.tint); Text(L(title)).font(.title2.bold()); Text(L(detail)).foregroundStyle(.secondary).multilineTextAlignment(.center) }.frame(maxWidth: .infinity).padding(24) }
}
struct AssetThumbnail: View {
    @EnvironmentObject var app: AppModel
    var id: String; var fit = false
    @State private var image: UIImage?
    @State private var request: PHImageRequestID?
    @State private var network = false
    @State private var failed = false
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color(uiColor: .tertiarySystemFill)
                if let image { Image(uiImage: image).resizable().aspectRatio(contentMode: fit ? .fit : .fill).frame(width: geometry.size.width, height: geometry.size.height).clipped() }
                else if failed { VStack { Image(systemName: "icloud.and.arrow.down"); if fit { Button(L("media.download")) { network = true; load() }.buttonStyle(.bordered) } } }
                else { ProgressView() }
            }.task(id: id) { network = false; load() }
                .onDisappear { if let request { app.library.images.cancelImageRequest(request) } }
        }.accessibilityLabel(L("media.preview"))
    }
    private func load() {
        if let request { app.library.images.cancelImageRequest(request) }; image = nil; failed = false
        let expected = id
        request = app.library.image(id, size: fit ? CGSize(width: 1200, height: 1600) : CGSize(width: 350, height: 350), network: network) { value in
            guard expected == id else { return }; image = value; failed = value == nil
        }
    }
}
struct MediaPlayerView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.scenePhase) var phase
    var id: String?; var url: URL? = nil
    @State private var player: AVPlayer?
    @State private var loading = false
    var body: some View {
        VStack {
            if let player { VideoPlayer(player: player).frame(minHeight: 220) }
            else { Button { Task { loading = true; defer { loading = false }; if let url { player = AVPlayer(url: url) } else if let id, let item = await app.library.video(id) { player = AVPlayer(playerItem: item) } } } label: { Label(L(loading ? "media.loading" : "media.play"), systemImage: "play.circle.fill").font(.title3).frame(maxWidth: .infinity, minHeight: 80) }.disabled(loading) }
            Text(L("media.network")).font(.caption).foregroundStyle(.secondary)
        }.onDisappear { player?.pause(); player = nil }.onChange(of: phase) { if $0 != .active { player?.pause() } }
    }
}
struct ZoomView: View {
    var id: String; var kind: MediaKind
    @State private var scale: CGFloat = 1
    var body: some View {
        VStack { if kind == .video { MediaPlayerView(id: id) } else { AssetThumbnail(id: id, fit: true).scaleEffect(scale).gesture(MagnificationGesture().onChanged { scale = min(4, max(1, $0)) }).clipped(); Button(L("zoom.reset")) { scale = 1 } } }
            .padding().navigationTitle(L("media.preview")).navigationBarTitleDisplayMode(.inline)
    }
}
