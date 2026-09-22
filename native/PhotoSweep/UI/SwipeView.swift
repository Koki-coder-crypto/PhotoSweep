import SwiftUI

struct SwipeView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @Environment(\.dynamicTypeSize) var dynamicTypeSize
    @Environment(\.scenePhase) private var phase
    @State private var visible = false
    @State private var drag: CGFloat = 0
    @State private var committing = false
    @State private var outgoing: MediaItem?
    @State private var help = false
    @State private var hintOffset: CGFloat = 0
    @State private var hintTask: Task<Void, Never>?
    private var months: [String] { app.mediaIndex.months }
    private var current: MediaItem? {
        if let outgoing { return outgoing }
        guard let session = app.state.session, session.ids.indices.contains(session.cursor) else { return nil }
        return app.mediaIndex.byID[session.ids[session.cursor]]
    }
    private var reduced: Bool { reduceMotion || app.state.settings.reduceMotion }
    private var activityVisible: Bool {
        visible && phase == .active && app.tab == 1 && !app.paywall && !app.showResult && !app.replay
            && !app.state.needsOnboarding && !app.preparingSwipe && app.state.session?.status == "active"
    }
    var body: some View {
        GeometryReader { viewport in
        ScrollView {
            VStack(spacing: 16) {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 18) {
                        ForEach(months.prefix(18), id: \.self) { month in MonthCircle(month: month) { choose(month) } }
                        NavigationLink { MonthListView { choose($0) } } label: { VStack { Image(systemName: "calendar").font(.title).frame(width: 66, height: 66).background(Color(uiColor: .tertiarySystemFill), in: Circle()); Text(L("months.all")).font(.caption) } }.buttonStyle(.plain)
                    }.padding(.horizontal, 16)
                }
                if app.preparingSwipe { ProgressView(L("media.preparing")).frame(height: 240) }
                else if let session = app.state.session {
                    if session.status == "summary" && outgoing == nil { SummaryView() }
                    else if let current {
                        sessionHeader(session)
                        SwipeDeck(current: current, nextID: session.ids.indices.contains(session.cursor + (outgoing == nil ? 1 : 0)) ? session.ids[session.cursor + (outgoing == nil ? 1 : 0)] : nil,
                                  reduced: reduced, committing: committing, blocked: app.busy, exitOffset: drag,
                                  help: help, hintOffset: hintOffset, stopHint: stopHint,
                                  commit: { choice, width in commit(current.id, choice: choice, width: width) }).frame(height: dynamicTypeSize.isAccessibilitySize
                            ? max(150, min(240, viewport.size.height * 0.27))
                            : max(180, min(420, viewport.size.height * 0.53))).padding(.horizontal, 16)
                        HStack {
                            Button(L("action.skip")) { Task { _ = await app.decide(current.id, choice: nil) } }.disabled(app.busy || committing)
                            Spacer()
                            NavigationLink { ZoomView(id: current.id, kind: current.kind) } label: { Label(L("zoom.title"), systemImage: "arrow.up.left.and.arrow.down.right") }
                        }.padding(.horizontal, 24)
                    } else {
                        EmptyViewState(title: "media.unavailable", detail: "media.skipDetail")
                        if session.ids.indices.contains(session.cursor) { Button(L("action.skip")) { Task { _ = await app.decide(session.ids[session.cursor], choice: nil) } } }
                    }
                } else {
                    EmptyViewState(title: "swipe.chooseMonth", detail: "swipe.instructions")
                    if let month = months.first { ActionButton(title: "swipe.start") { choose(month) }.padding(.horizontal, 16) }
                }
                CandidateSummary()
                QuotaLabel()
                NavigationLink(L("filter.title")) { FilterView() }.padding()
            }.padding(.vertical, 16)
        }.safeAreaInset(edge: .bottom, spacing: 0) {
            if !app.preparingSwipe, let session = app.state.session, let current, session.status != "summary" || outgoing != nil {
                decisionControls(current, session: session).padding(.vertical, 10).background(.bar)
            }
        }
        }.navigationTitle(L("tab.swipe")).navigationBarTitleDisplayMode(.inline)
            .task(id: current?.id) {
                if let session = app.state.session { app.library.prefetch(Array(session.ids.dropFirst(session.cursor).prefix(3))) }
            }
            .onAppear { visible = true; app.setReviewActivity(visible: activityVisible) }
            .onChange(of: activityVisible) { app.setReviewActivity(visible: $0) }
            .onChange(of: app.state.session?.id) { _ in app.setReviewActivity(visible: activityVisible) }
            .onDisappear { visible = false; app.setReviewActivity(visible: false); stopHint(); app.library.clearPrefetch() }
    }
    private func sessionHeader(_ session: Session) -> some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
            : AnyLayout(HStackLayout(spacing: 12))
        return layout {
            Text(session.scope.month ?? L("tab.swipe")).font(.headline)
                .fixedSize(horizontal: false, vertical: true)
            HStack {
                Spacer(minLength: 0)
                Text("\(session.cursor + 1) / \(session.target)").monospacedDigit()
                Button { showHint() } label: {
                    Image(systemName: "questionmark.circle").frame(minWidth: 44, minHeight: 44)
                }.accessibilityLabel(L("swipe.help"))
            }
        }.padding(.horizontal, 16)
    }
    private func decisionControls(_ current: MediaItem, session: Session) -> some View {
        let layout = dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 8)) : AnyLayout(HStackLayout(spacing: 12))
        return layout {
                            Button { commit(current.id, choice: .candidate) } label: { Label(L("action.candidate"), systemImage: "trash").frame(maxWidth: .infinity, minHeight: 48) }.tint(coral).accessibilityIdentifier("swipe.candidate")
                            Button { Task { _ = await app.mutate({ try ReviewEngine.undo($0) }, haptic: true) } } label: { Image(systemName: "arrow.uturn.backward").frame(minWidth: 44, minHeight: 48) }.disabled(session.steps.isEmpty).accessibilityLabel(L("action.undo")).accessibilityIdentifier("swipe.undo")
                            Button { commit(current.id, choice: .keep) } label: { Label(L("action.keep"), systemImage: "heart").frame(maxWidth: .infinity, minHeight: 48) }.accessibilityIdentifier("swipe.keep")
                        }.buttonStyle(.bordered).disabled(app.busy || committing).padding(.horizontal, 16)
    }
    private func choose(_ month: String) {
        guard !committing, !app.busy else { return }
        stopHint(); Task { await app.begin(Scope(month: month)); if !app.state.monthHintSeen, app.state.session?.scope.month == month { showHint(); _ = await app.mutate { s in var n = s; n.monthHintSeen = true; return n } } }
    }
    private func commit(_ id: String, choice: Choice, width: CGFloat = 390) {
        guard !committing, !app.busy, !app.preparingSwipe else { return }; stopHint(); committing = true; outgoing = current
        Task {
            if await app.decide(id, choice: choice) {
                // The transaction has committed. Animate only presentation, never durability.
                withAnimation(.easeOut(duration: reduced ? 0.12 : 0.22)) { drag = (choice == .candidate ? -1 : 1) * width * 1.3 }
                try? await Task.sleep(nanoseconds: reduced ? 120_000_000 : 220_000_000)
            } else { withAnimation(reduced ? .linear(duration: 0.12) : .spring(response: 0.3)) { drag = 0 }; try? await Task.sleep(nanoseconds: reduced ? 120_000_000 : 300_000_000) }
            outgoing = nil; drag = 0; committing = false
        }
    }
    private func showHint() {
        stopHint(); help = true
        hintTask = Task {
            if !reduced {
                withAnimation(.easeInOut(duration: 0.6)) { hintOffset = -65 }; try? await Task.sleep(nanoseconds: 600_000_000)
                guard !Task.isCancelled else { return }; withAnimation(.easeInOut(duration: 0.6)) { hintOffset = 0 }; try? await Task.sleep(nanoseconds: 600_000_000)
                guard !Task.isCancelled else { return }; withAnimation(.easeInOut(duration: 0.6)) { hintOffset = 65 }; try? await Task.sleep(nanoseconds: 600_000_000)
                guard !Task.isCancelled else { return }; withAnimation(.easeInOut(duration: 0.6)) { hintOffset = 0 }
            }
            try? await Task.sleep(nanoseconds: 600_000_000); if !Task.isCancelled { help = false }
        }
    }
    private func stopHint() { hintTask?.cancel(); help = false; hintOffset = 0 }
}
struct MonthCircle: View {
    @EnvironmentObject var app: AppModel
    var month: String; var action: () -> Void
    private var items: [MediaItem] { app.mediaIndex.byMonth[month] ?? [] }
    private var reviewed: Int { app.reviewedByMonth[month] ?? 0 }
    var body: some View {
        Button(action: action) { VStack(spacing: 6) {
            ZStack { if let first = items.first { MediaThumbnail(id: first.id).clipShape(Circle()).padding(5) }; Circle().stroke(Color(uiColor: .tertiarySystemFill), lineWidth: 3); Circle().trim(from: 0, to: CGFloat(reviewed) / CGFloat(max(1, items.count))).stroke(Color.accentColor, style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(-90)); if reviewed == items.count { Image(systemName: "checkmark.circle.fill").foregroundStyle(.white, Color.accentColor).offset(x: 24, y: 24) } }.frame(width: 66, height: 66)
            Text(month).font(.caption.weight(.semibold)); Text(String(format: L("count.remaining"), items.count - reviewed)).font(.caption2).foregroundStyle(.secondary)
        } }.buttonStyle(.plain).accessibilityLabel(month + ", " + String(format: L("count.remaining"), items.count - reviewed)).disabled(app.busy)
    }
}
struct MonthListView: View {
    @EnvironmentObject var app: AppModel
    @Environment(\.dismiss) var dismiss
    var select: (String) -> Void
    var body: some View { List(app.mediaIndex.months, id: \.self) { month in Button(month) { select(month); dismiss() }.frame(minHeight: 44) }.navigationTitle(L("months.all")) }
}
struct CandidateSummary: View {
    @EnvironmentObject var app: AppModel
    var body: some View { Panel {
        HStack { Text(String(format: L("count.candidates"), app.state.candidates.count)).font(.headline); Spacer(); SizeLabel(ids: app.state.candidates) }
        ActionButton(title: "candidates.review") { app.tab = 2 }
    }.padding(.horizontal, 16) }
}
struct SummaryView: View {
    @EnvironmentObject var app: AppModel
    var body: some View { Panel {
        Image(systemName: "checkmark.circle.fill").font(.system(size: 60)).foregroundStyle(.tint).frame(maxWidth: .infinity)
        Text(L("summary.title")).font(.largeTitle.bold())
        if let session = app.state.session { Text(String(format: L("summary.counts"), session.steps.filter { $0.choice == .keep }.count, session.steps.filter { $0.choice == .candidate }.count)); ActionButton(title: "summary.continue") { Task { await app.begin(session.scope) } } }
        if let session = app.state.session, let seconds = session.activeSeconds, let count = session.timedReviewCount, count > 0, seconds > 0 {
            Text(String(format: L("result.reviewPace"), count, SuccessExperience.duration(seconds))).font(.title2.bold()).foregroundStyle(coral)
            Text(L("result.activeTimeNote")).font(.caption).foregroundStyle(.secondary)
        }
        Button(L("summary.done")) { app.tab = 0 }.frame(maxWidth: .infinity, minHeight: 44)
    }.padding(16) }
}
struct FilterView: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var billing: Billing
    @Environment(\.dismiss) var dismiss
    @State private var start = Date().addingTimeInterval(-30 * 86400)
    @State private var end = Date()
    @State private var oldest = false
    var body: some View { Form {
        Section { DatePicker(L("filter.start"), selection: $start, displayedComponents: .date); DatePicker(L("filter.end"), selection: $end, in: start..., displayedComponents: .date); Toggle(L("filter.oldest"), isOn: $oldest) }
        Section { if billing.allowsPro { ActionButton(title: "filter.begin") { Task { let exclusive = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: end))!; await app.begin(Scope(start: Calendar.current.startOfDay(for: start).timeIntervalSince1970 * 1000, end: exclusive.timeIntervalSince1970 * 1000, order: oldest ? "oldest" : "newest")); dismiss() } } } else { Text(L("filter.pro")); Button(L("pro.see")) { app.paywall = true } } }
    }.navigationTitle(L("filter.title")) }
}


private struct SwipeDeck: View {
    var current: MediaItem
    var nextID: String?
    var reduced: Bool
    var committing: Bool
    var blocked: Bool
    var exitOffset: CGFloat
    var help: Bool
    var hintOffset: CGFloat
    var stopHint: () -> Void
    var commit: (Choice, CGFloat) -> Void
    @State private var drag: CGFloat = 0
    var body: some View {
GeometryReader { geo in
                            ZStack {
                                if let nextID {
                                    AssetThumbnail(id: nextID, fit: true).clipShape(RoundedRectangle(cornerRadius: 24)).scaleEffect(reduced ? 1 : 0.95 + min(abs(drag) / max(1, geo.size.width), 1) * 0.05).offset(y: reduced ? 0 : 8)
                                }
                                MediaThumbnail(id: current.id, fit: true)
                                    .clipShape(RoundedRectangle(cornerRadius: 24))
                                    .overlay(alignment: drag < 0 ? .topLeading : .topTrailing) {
                                        if abs(drag) > 12 { Text(L(drag < 0 ? "action.candidate" : "action.keep")).font(SwiftUI.Font.title2.bold()).padding(12).background((drag < 0 ? coral : Color.accentColor).opacity(0.95), in: Capsule()).foregroundStyle(Color.white).padding(16).opacity(Double(min(abs(drag) / 90, 1))) }
                                    }
                                    .offset(x: reduced ? 0 : (committing ? exitOffset : drag) + hintOffset)
                                    .rotationEffect(.degrees(reduced ? 0 : Double(max(-12, min(12, drag / max(1, geo.size.width) * 12)))))
                                    .opacity(reduced && committing ? 0.6 : 1)
                                    .gesture(DragGesture(minimumDistance: 12).onChanged { value in
                                        if help { stopHint() }; guard !committing, !blocked, abs(value.translation.width) > abs(value.translation.height) * 1.2 else { return }
                                        drag = value.translation.width
                                    }.onEnded { value in
                                        guard !committing, !blocked else { return }
                                        let x = value.translation.width
                                        let horizontal = abs(x) > abs(value.translation.height) * 1.2
                                        let passed = abs(x) > geo.size.width * 0.26 || (abs(x) > geo.size.width * 0.12 && abs(value.predictedEndTranslation.width) > geo.size.width * 0.65)
                                        if horizontal && passed { commit(x < 0 ? .candidate : .keep, geo.size.width); drag = 0 }
                                        else { withAnimation(reduced ? .linear(duration: 0.12) : .spring(response: 0.32, dampingFraction: 0.8)) { drag = 0 } }
                                    })
                                    .accessibilityAction(named: Text(L("action.candidate"))) { commit(.candidate, 390) }
                                    .accessibilityAction(named: Text(L("action.keep"))) { commit(.keep, 390) }
                                if help {
                                    VStack(spacing: 8) { Image(systemName: "hand.draw.fill").font(.largeTitle); Text(L("swipe.instructions")).font(.headline); Text(L("delete.safe")).font(.caption); Button(L("ok")) { stopHint() } }.padding(20).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20)).padding()
                                }
                            }
                        }
    }
}
