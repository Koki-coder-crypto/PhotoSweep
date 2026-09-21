import SwiftUI

struct RootView: View {
    @EnvironmentObject var app: AppModel
    var body: some View {
        Group {
            if let fatal = app.fatal { VStack(spacing: 20) { EmptyViewState(title: "error.migration", detail: fatal, icon: "externaldrive.badge.exclamationmark"); Button(L("retry")) { Task { await app.launch() } } } }
            else if !app.ready { VStack { Image("BrandMark").resizable().frame(width: 88, height: 88); ProgressView() } }
            else { TabView(selection: $app.tab) {
                NavigationStack { HomeView() }.tabItem { Label(L("tab.organize"), systemImage: "square.grid.2x2") }.tag(0)
                NavigationStack { SwipeView() }.tabItem { Label(L("tab.swipe"), systemImage: "rectangle.stack") }.tag(1)
                NavigationStack { CandidatesView() }.tabItem { Label(L("tab.candidates"), systemImage: "trash") }.tag(2)
            } }
        }
        .sheet(isPresented: $app.paywall) { NavigationStack { PaywallView() } }
        .sheet(isPresented: $app.showResult) { NavigationStack { ResultView() } }
        .fullScreenCover(isPresented: Binding(get: { app.ready && (app.state.needsOnboarding || app.replay) }, set: { _ in })) { NavigationStack { OnboardingView() } }
        .alert(L("notice"), isPresented: Binding(get: { app.error != nil }, set: { if !$0 { app.error = nil } })) { Button(L("ok")) { app.error = nil } } message: { Text(app.error ?? "") }
    }
}
struct HomeView: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var billing: Billing
    @StateObject private var preview = HomePreviewPlayer()
    @Environment(\.scenePhase) private var phase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var frames: [Category: CGRect] = [:]
    @State private var viewportHeight: CGFloat = 0
    @State private var visible = false
    @State private var lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
    @State private var memoryPaused = false
    private func updatePreview() {
        let allowed = visible && app.tab == 0 && phase == .active && !reduceMotion && !app.state.settings.reduceMotion
            && !lowPower && !memoryPaused && !app.paywall && !app.showResult && !app.replay && !app.state.needsOnboarding
        preview.show(allowed ? HomePreviewPlayer.visibleCategory(frames: frames, height: viewportHeight, summaries: app.homePreviews) : nil, summaries: app.homePreviews)
    }
    var body: some View {
        GeometryReader { viewport in
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 12) { Image("BrandMark").resizable().frame(width: 48, height: 48); VStack(alignment: .leading) { Text("PhotoSweep").font(.title.bold()); Text(L("home.headline")).foregroundStyle(.secondary) }; Spacer() }
                if app.state.onboarding?.homeHintSeen == false && app.state.onboarded {
                    Panel {
                        Text(L("home.orientation")).font(.headline)
                        ActionButton(title: "ok") { Task { _ = await app.mutate { s in var n = s; n.onboarding?.homeHintSeen = true; return n } } }
                    }
                }
                if !app.library.accessible { PermissionPanel() }
                if app.loading { ProgressView(L("library.loading")) }
                if let free = app.freeBytes, let total = app.totalBytes {
                    Panel { HStack { Label(L("storage.free"), systemImage: "internaldrive"); Spacer(); Text(bytesText(free)).fontWeight(.semibold) }; ProgressView(value: total - free, total: total); Text(String(format: L("storage.total"), bytesText(total))).font(.caption).foregroundStyle(.secondary) }
                } else { Button(L("storage.retry")) { app.storage() } }
                ForEach([Category.videos, .similar, .duplicate, .screenshots, .recordings, .all, .compression], id: \.self) { category in
                    NavigationLink {
                        CollectionView(category: category)
                    } label: {
                        HomeMediaCard(category: category, summary: app.homePreviews[category] ?? HomeMediaSummary(),
                                      pending: app.loading || ((category == .similar || category == .duplicate) && app.analyzing), preview: preview)
                    }.buttonStyle(.plain).accessibilityIdentifier("home.category." + category.rawValue)
                }
                Panel { Text(L("home.months")).font(.title2.bold()); Text(L("home.monthsDetail")); ActionButton(title: app.state.session == nil ? "swipe.start" : "swipe.resume", symbol: "rectangle.stack") { app.tab = 1 } }
                QuotaLabel()
                if !billing.allowsPro { Button(L("pro.see")) { app.paywall = true }.frame(maxWidth: .infinity, minHeight: 44) }
            }.padding(16)
        }.background(Color(uiColor: .systemGroupedBackground)).navigationTitle(L("tab.organize")).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .navigationBarTrailing) { NavigationLink { SettingsView() } label: { Image(systemName: "gearshape").accessibilityLabel(L("settings.title")) } } }
            .refreshable { app.reload() }
            .coordinateSpace(name: "homeViewport")
            .onPreferenceChange(HomeCardFrames.self) { frames = $0; viewportHeight = viewport.size.height; updatePreview() }
            .onAppear { visible = true; memoryPaused = false; viewportHeight = viewport.size.height; updatePreview() }
            .onDisappear { visible = false; preview.stop() }
            .onChange(of: app.tab) { _ in updatePreview() }
            .onChange(of: phase) { _ in updatePreview() }
            .onChange(of: reduceMotion) { _ in updatePreview() }
            .onChange(of: app.state.settings.reduceMotion) { _ in updatePreview() }
            .onChange(of: app.paywall) { _ in updatePreview() }
            .onChange(of: app.showResult) { _ in updatePreview() }
            .onChange(of: app.replay) { _ in updatePreview() }
            .onChange(of: app.state.needsOnboarding) { _ in updatePreview() }
            .onChange(of: app.homePreviews[.videos]?.videoID) { _ in updatePreview() }
            .onChange(of: app.homePreviews[.recordings]?.videoID) { _ in updatePreview() }
            .onReceive(NotificationCenter.default.publisher(for: .NSProcessInfoPowerStateDidChange)) { _ in
                lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled; updatePreview()
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.didReceiveMemoryWarningNotification)) { _ in
                memoryPaused = true; preview.stop()
            }
        }
    }
}
struct QuotaLabel: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var billing: Billing
    var body: some View {
        Text(billing.allowsPro ? L("quota.unlimited") : String(format: L("quota.remaining"), ReviewEngine.remaining(ReviewEngine.refresh(app.state, WallClock()), .photo), ReviewEngine.remaining(ReviewEngine.refresh(app.state, WallClock()), .video)))
            .font(.footnote).foregroundStyle(.secondary).frame(maxWidth: .infinity).accessibilityIdentifier("quota.remaining")
    }
}
struct PermissionPanel: View {
    @EnvironmentObject var app: AppModel
    var body: some View { Panel {
        Label(L("permission.title"), systemImage: "photo.badge.checkmark").font(.title2.bold())
        Text(L("permission.detail"))
        ActionButton(title: "permission.choose") { Task { if app.permission == .notDetermined { await app.requestPhotos() } else { await UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!) } } }
    } }
}
