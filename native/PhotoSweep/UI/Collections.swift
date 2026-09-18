import SwiftUI

enum Category: String, Hashable {
    case videos, recordings, screenshots, similar, duplicate, all, compression
    var title: String { "category.\(rawValue)" }
    var symbol: String { switch self { case .videos: return "video.fill"; case .recordings: return "record.circle"; case .screenshots: return "rectangle.inset.filled"; case .similar: return "square.on.square"; case .duplicate: return "square.stack.3d.up"; case .all: return "photo.on.rectangle"; case .compression: return "arrow.down.right.and.arrow.up.left" } }
}
struct SizeLabel: View {
    @EnvironmentObject var app: AppModel
    var ids: [String]
    var body: some View {
        let known = ids.compactMap { app.state.sizes[$0]?.bytes }
        VStack(alignment: .trailing, spacing: 4) {
            if !known.isEmpty { Text(bytesText(known.reduce(0, +))).monospacedDigit() }
            if known.count < ids.count { Text(L("size.incomplete")).font(.caption).foregroundStyle(.secondary) }
        }
    }
}
struct CollectionView: View {
    @EnvironmentObject var app: AppModel
    var category: Category
    @State private var selected = Set<String>()
    private var items: [MediaItem] {
        let base = app.photos.filter { p in switch category {
        case .videos, .compression: return p.kind == .video
        case .recordings: return p.recording
        case .screenshots: return p.screenshot
        case .all: return p.kind == .photo
        case .similar, .duplicate: return false
        } }
        if [.videos, .compression, .recordings].contains(category) { return base.sorted { (app.state.sizes[$0.id]?.bytes ?? -1) > (app.state.sizes[$1.id]?.bytes ?? -1) } }
        return base
    }
    private var groups: [PhotoGroup] { app.groups.filter { $0.kind == category.rawValue } }
    var body: some View {
        ScrollView { LazyVStack(alignment: .leading, spacing: 16) {
            if category == .similar || category == .duplicate {
                if app.analyzing { ProgressView(L("analysis.running")) }
                ForEach(groups) { group in Panel {
                    HStack { Text(String(format: L("count.items"), group.ids.count)).font(.headline); Spacer(); Button(L("selection.suggest")) { selected.formUnion(group.ids.filter { $0 != group.recommended }) } }
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 12) { ForEach(group.ids, id: \.self) { id in tile(id, recommended: id == group.recommended) } }
                } }
                if groups.isEmpty && !app.analyzing { EmptyViewState(title: "collection.empty", detail: "analysis.localOnly") }
            } else {
                if items.isEmpty { EmptyViewState(title: "collection.empty", detail: "collection.emptyDetail") }
                ForEach(items) { item in Panel {
                    HStack(alignment: .top) {
                        AssetThumbnail(id: item.id).frame(width: 112, height: 112).clipShape(RoundedRectangle(cornerRadius: 14))
                        VStack(alignment: .leading, spacing: 12) { Text(Date(timeIntervalSince1970: item.createdAt / 1000), style: .date).font(.headline); if item.kind == .video { Text(String(format: "%d:%02d", Int(item.duration) / 60, Int(item.duration) % 60)).monospacedDigit() }; SizeLabel(ids: [item.id]); NavigationLink(L("media.preview")) { ZoomView(id: item.id, kind: item.kind) } }
                    }
                    if category == .compression { NavigationLink { CompressionView(assetId: item.id) } label: { Label(L("compression.begin"), systemImage: "arrow.down.right.and.arrow.up.left").frame(maxWidth: .infinity, minHeight: 44) }.buttonStyle(.bordered) }
                    else { Button { toggle(item.id) } label: { Label(L(selected.contains(item.id) ? "selection.remove" : "selection.add"), systemImage: selected.contains(item.id) ? "checkmark.circle.fill" : "circle").frame(maxWidth: .infinity, minHeight: 44) }.buttonStyle(.bordered).tint(selected.contains(item.id) ? coral : .accentColor) }
                } }
            }
        }.padding(16) }
        .background(Color(uiColor: .systemGroupedBackground)).navigationTitle(L(category.title)).navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            if category != .compression { VStack(spacing: 8) { QuotaLabel(); ActionButton(title: String(format: L("selection.stage"), selected.count)) { Task { if await app.stage(Array(selected)) { selected = []; app.tab = 2 } } }.disabled(selected.isEmpty || app.busy) }.padding(16).background(.regularMaterial) }
        }
        .task(id: app.photos.count) { if [.videos, .recordings, .compression].contains(category) { await app.measure(items.map(\.id)) } }
    }
    private func toggle(_ id: String) { if selected.contains(id) { selected.remove(id) } else { selected.insert(id) }; app.feedback() }
    private func tile(_ id: String, recommended: Bool) -> some View {
        VStack {
            Button { toggle(id) } label: { AssetThumbnail(id: id).frame(height: 155).clipShape(RoundedRectangle(cornerRadius: 12)).overlay(alignment: .topTrailing) { Image(systemName: selected.contains(id) ? "checkmark.circle.fill" : "circle").font(.title2).foregroundStyle(.white, coral).padding(8) } }.accessibilityLabel(L(selected.contains(id) ? "selection.remove" : "selection.add"))
            if recommended { Label(L("comparison.recommended"), systemImage: "star").font(.caption) }
            NavigationLink(L("zoom.title")) { ZoomView(id: id, kind: .photo) }.frame(minHeight: 44)
        }
    }
}
struct CandidatesView: View {
    @EnvironmentObject var app: AppModel
    var body: some View {
        ScrollView { LazyVStack(spacing: 16) {
            Text(L("delete.safe")).font(.headline)
            Text(L("delete.explanation")).font(.footnote).foregroundStyle(.secondary)
            if app.state.locked { Panel { Text(L("delete.uncertain")); ActionButton(title: "delete.recheck") { Task { await app.reconcileDeletion(); app.showResult = true } } } }
            if app.state.candidates.isEmpty { EmptyViewState(title: "candidates.empty", detail: "candidates.emptyDetail") }
            ForEach(app.state.candidates, id: \.self) { id in Panel {
                HStack { AssetThumbnail(id: id).frame(width: 100, height: 100).clipShape(RoundedRectangle(cornerRadius: 12)); VStack(alignment: .leading) { SizeLabel(ids: [id]); NavigationLink(L("media.preview")) { ZoomView(id: id, kind: app.state.kind(id)) }; Button(L("candidate.restore")) { Task { _ = await app.mutate { s in guard !s.locked else { throw ReviewFailure.locked }; var n = s; n.decisions[id]?.choice = .keep; return n } } }.disabled(app.state.locked || app.busy).frame(minHeight: 44) } }
            } }
        }.padding(16) }.background(Color(uiColor: .systemGroupedBackground)).navigationTitle(L("tab.candidates"))
            .safeAreaInset(edge: .bottom) { if !app.state.candidates.isEmpty { VStack { SizeLabel(ids: app.state.candidates); ActionButton(title: String(format: L("delete.count"), app.state.candidates.count), symbol: "trash") { Task { await app.deleteCandidates(app.state.candidates) } }.tint(coral).disabled(app.busy || app.state.locked) }.padding(16).background(.regularMaterial) } }
            .task(id: app.state.candidates) { await app.measure(app.state.candidates) }
    }
}
struct ResultView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    @Environment(\.requestReview) var requestReview
    @Environment(\.scenePhase) var phase
    @State private var interacted = false
    @State private var appeared = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        ScrollView { VStack(spacing: 24) {
            if let job = app.state.deletion, let outcome = app.state.outcomes.first(where: { $0.id == job.id }), !job.deleted.isEmpty {
                Image(systemName: "checkmark.circle.fill").font(.system(size: 76)).foregroundStyle(.tint).scaleEffect(appeared || reduceMotion || app.state.settings.reduceMotion ? 1 : 0.85).opacity(appeared ? 1 : 0)
                Text(String(format: L("result.title"), outcome.photoCount + outcome.videoCount)).font(.largeTitle.bold()).multilineTextAlignment(.center)
                Panel { Text(L("result.data")); Text(bytesText(outcome.knownBytes)).font(.system(.largeTitle, design: .rounded).bold()); Text(String(format: L("result.breakdown"), outcome.photoCount, outcome.videoCount)); if outcome.unknownCount > 0 { Text(String(format: L("result.unknown"), outcome.unknownCount)).font(.footnote) }; if outcome.estimated { Text(L("size.estimated")).font(.footnote) } }
                if let before = outcome.freeBefore, let after = outcome.freeAfter { Panel { Text(L("result.measured")); Text(bytesText(before) + " → " + bytesText(after)); Text(L("result.measureNote")).font(.caption) } }
            } else { EmptyViewState(title: app.state.deletion?.status == "cancelled" ? "delete.cancelled" : "delete.uncertain", detail: "delete.originals", icon: "info.circle") }
            if app.state.locked { ActionButton(title: "delete.recheck") { Task { await app.reconcileDeletion() } } }
            Text(L("delete.explanation")).font(.footnote).foregroundStyle(.secondary)
            ActionButton(title: "result.anotherMonth") { app.tab = 1; dismiss() }
            NavigationLink(L("restore.title")) { HelpDetailView(kind: "restore") }
        }.padding(24) }.navigationTitle(L("result.heading")).navigationBarTitleDisplayMode(.inline)
            .toolbar { Button(L("done")) { dismiss() } }
            .onAppear { withAnimation(.easeOut(duration: reduceMotion || app.state.settings.reduceMotion ? 0.12 : 0.45)) { appeared = true } }
            .simultaneousGesture(DragGesture(minimumDistance: 0).onChanged { _ in interacted = true })
            .task {
                try? await Task.sleep(nanoseconds: 2_150_000_000)
                guard !Task.isCancelled, !interacted, phase == .active, !app.busy, !app.billing.busy, !app.billing.pending,
                      app.state.deletion?.status == "done", ReviewEngine.mayRequestReview(app.state, version: "2.0.0") else { return }
                let ok = await app.mutate { s in var n = s; n.reviewPrompt = ReviewPrompt(at: WallClock().now, version: "2.0.0"); return n }
                if ok && !Task.isCancelled && !interacted && phase == .active { requestReview() }
            }.onChange(of: phase) { if $0 != .active { interacted = true } }.onDisappear { interacted = true }
    }
}
