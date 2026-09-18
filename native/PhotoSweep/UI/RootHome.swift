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
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
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
                NavigationLink { CollectionView(category: .videos) } label: {
                    Panel { Label(L("category.videos"), systemImage: "video.fill").font(.title2.bold()); Text(L("home.videosDetail")).foregroundStyle(.secondary); HStack { Text(String(format: L("count.videos"), app.photos.filter { $0.kind == .video }.count)); Spacer(); Image(systemName: "arrow.right.circle.fill").font(.title) } }
                }.buttonStyle(.plain)
                HStack { Text(L("home.compare")).font(.title2.bold()); Spacer(); if app.analyzing { ProgressView() } }
                ForEach([Category.similar, .duplicate, .screenshots, .recordings, .all, .compression], id: \.self) { category in
                    NavigationLink { CollectionView(category: category) } label: {
                        HStack(spacing: 16) { Image(systemName: category.symbol).font(.title2).frame(width: 44, height: 44).background(Color.accentColor.opacity(0.1), in: RoundedRectangle(cornerRadius: 12)); VStack(alignment: .leading) { Text(L(category.title)).font(.headline); Text(L(category == .compression ? "pro.feature" : (app.analyzing && (category == .similar || category == .duplicate) ? "analysis.running" : "home.choose"))).font(.caption).foregroundStyle(.secondary) }; Spacer(); Image(systemName: "chevron.right").foregroundStyle(.secondary) }.padding(16).background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                    }.buttonStyle(.plain)
                }
                Panel { Text(L("home.months")).font(.title2.bold()); Text(L("home.monthsDetail")); ActionButton(title: app.state.session == nil ? "swipe.start" : "swipe.resume", symbol: "rectangle.stack") { app.tab = 1 } }
                QuotaLabel()
                if !billing.allowsPro { Button(L("pro.see")) { app.paywall = true }.frame(maxWidth: .infinity, minHeight: 44) }
            }.padding(16)
        }.background(Color(uiColor: .systemGroupedBackground)).navigationTitle(L("tab.organize")).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .navigationBarTrailing) { NavigationLink { SettingsView() } label: { Image(systemName: "gearshape").accessibilityLabel(L("settings.title")) } } }
            .refreshable { app.reload() }
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
