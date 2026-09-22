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
    @State private var failed = false
    @State private var generation = UUID()
    @State private var targetSize = CGSize(width: 200, height: 200)
    @Environment(\.displayScale) private var displayScale
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color(uiColor: .tertiarySystemFill)
                if let image { Image(uiImage: image).resizable().aspectRatio(contentMode: fit ? .fit : .fill).frame(width: geometry.size.width, height: geometry.size.height).clipped() }
                else if failed { VStack { Image(systemName: "photo"); if fit { Text(L("media.previewUnavailable")).font(.footnote); Button(L("retry")) { load() }.buttonStyle(.bordered) } } }
                else { ProgressView() }
            }.task(id: id) {
                    targetSize = CGSize(width: max(1, min(1200, geometry.size.width * displayScale)), height: max(1, min(1600, geometry.size.height * displayScale)))
                    load()
                }
                .onDisappear { generation = UUID(); if let request { app.library.images.cancelImageRequest(request) }; request = nil; image = nil }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didReceiveMemoryWarningNotification)) { _ in app.library.clearPrefetch() }
        }.accessibilityLabel(L("media.preview"))
    }
    private func load() {
        if let request { app.library.images.cancelImageRequest(request) }; image = app.library.cachedPreview(id); failed = false
        generation = UUID(); let expected = generation
        request = app.library.image(id, size: targetSize) { value in
            guard expected == generation else { return }; if let value { image = value }; failed = image == nil
        }
    }
}
struct MediaPlayerView: View {
    var id: String?; var url: URL? = nil
    var body: some View { AutoPlayingVideo(id: id, url: url, fit: true, controls: true).frame(minHeight: 220) }
}
struct ZoomView: View {
    var id: String; var kind: MediaKind
    @State private var scale: CGFloat = 1
    var body: some View {
        VStack { if kind == .video { MediaPlayerView(id: id) } else {
            AssetThumbnail(id: id, fit: true).scaleEffect(scale).gesture(MagnificationGesture().onChanged { scale = min(4, max(1, $0)) }).clipped()
                .accessibilityValue(String(format: "%.0f%%", scale * 100))
                .accessibilityAdjustableAction { direction in switch direction { case .increment: scale = min(4, scale + 0.5); case .decrement: scale = max(1, scale - 0.5); @unknown default: break } }
            HStack {
                Button { scale = max(1, scale - 0.5) } label: { Image(systemName: "minus.magnifyingglass").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel(L("zoom.out")).disabled(scale <= 1)
                Spacer(); Button(L("zoom.reset")) { scale = 1 }.frame(minHeight: 44); Spacer()
                Button { scale = min(4, scale + 0.5) } label: { Image(systemName: "plus.magnifyingglass").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel(L("zoom.in")).disabled(scale >= 4)
            }
        } }
            .padding().navigationTitle(L("media.preview")).navigationBarTitleDisplayMode(.inline)
    }
}
