import SwiftUI
import StoreKit

struct OnboardingView: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var billing: Billing
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @State private var appeared = false
    @State private var offset: CGFloat = 0
    private var intro: Onboarding { app.state.onboarding ?? Onboarding() }
    private let steps = ["welcome", "compare", "swipe", "permission", "discover", "pro"]
    var body: some View {
        ScrollView { VStack(spacing: 24) {
            HStack { Image("BrandMark").resizable().frame(width: 36, height: 36); Text("PhotoSweep").font(.headline); Spacer(); if intro.step != "welcome" { Button(L("back")) { move(-1) } } }
            ProgressView(value: Double((steps.firstIndex(of: intro.step) ?? 0) + 1), total: 6)
            Text(L("intro.\(intro.step).title")).font(.largeTitle.bold()).multilineTextAlignment(.center)
            Text(L("intro.\(intro.step).detail")).foregroundStyle(.secondary).multilineTextAlignment(.center)
            if intro.step == "welcome" {
                ZStack { ForEach(0..<3) { index in SampleCard(index: index).frame(width: 190, height: 240).rotationEffect(.degrees(reduceMotion ? 0 : (appeared ? Double(index - 1) * 10 : Double(index - 1) * 22))).offset(x: reduceMotion ? 0 : CGFloat(index - 1) * (appeared ? 35 : 70)) } }.frame(height: 300).accessibilityHidden(true)
            } else if intro.step == "compare" {
                Text(L("practice.label")).font(.caption.bold()).padding(8).background(Color.accentColor.opacity(0.12), in: Capsule())
                HStack { ForEach(0..<3) { index in Button { Task { _ = await app.mutate({ s in var n = s; var i = n.onboarding ?? Onboarding(); if i.selected.contains(index) { i.selected.removeAll { $0 == index } } else { i.selected.append(index) }; n.onboarding = i; return n }, haptic: true) } } label: { SampleCard(index: index).frame(height: 180).overlay(alignment: .topTrailing) { Image(systemName: intro.selected.contains(index) ? "checkmark.circle.fill" : "circle").font(.title2).padding(8) } }.accessibilityLabel(String(format: L("practice.sample"), index + 1)).accessibilityAddTraits(intro.selected.contains(index) ? .isSelected : []) } }
                Text(String(format: L("practice.selected"), intro.selected.count))
            } else if intro.step == "swipe" {
                Text(L("practice.label")).font(.caption.bold())
                SampleCard(index: 1).frame(width: 240, height: 290).offset(x: reduceMotion ? 0 : offset).rotationEffect(.degrees(reduceMotion ? 0 : Double(offset / 25))).gesture(DragGesture().onChanged { offset = $0.translation.width }.onEnded { value in if abs(value.translation.width) > 65 && abs(value.translation.width) > abs(value.translation.height) { practice(value.translation.width > 0) }; withAnimation { offset = 0 } })
                HStack { Button { practice(false) } label: { Label(L("action.candidate"), systemImage: intro.candidate ? "checkmark.circle.fill" : "arrow.left").frame(minHeight: 44) }; Spacer(); Button { practice(true) } label: { Label(L("action.keep"), systemImage: intro.kept ? "checkmark.circle.fill" : "arrow.right").frame(minHeight: 44) } }.buttonStyle(.bordered)
                Text(L("delete.safe")).font(.footnote)
            } else if intro.step == "permission" { PermissionPanel() }
            else if intro.step == "discover" {
                if app.loading || app.analyzing { ProgressView(L("analysis.running")) }
                Panel { Label(String(format: L("count.photos"), app.photos.filter { $0.kind == .photo }.count), systemImage: "photo"); Label(String(format: L("count.videos"), app.photos.filter { $0.kind == .video }.count), systemImage: "video"); Text(L(app.analysisComplete ? "analysis.complete" : "analysis.running")) }
                if !app.library.accessible { PermissionPanel() }
            } else if intro.step == "pro" { PaywallContent(onFinish: { Task { await app.finishOnboarding() } }) }
            if intro.step != "pro" {
                ActionButton(title: intro.step == "discover" && app.analyzing ? "analysis.continue" : "continue") { advance() }
                if ["compare", "swipe", "permission"].contains(intro.step) { Button(L("action.skip")) { advance() }.frame(minHeight: 44) }
            }
        }.padding(24) }
        .background(Color(uiColor: .systemGroupedBackground))
        .onAppear { withAnimation(.easeOut(duration: reduceMotion ? 0.12 : 0.6)) { appeared = true } }
        .navigationBarHidden(true)
    }
    private func practice(_ keep: Bool) { Task { _ = await app.mutate({ s in var n = s; var i = n.onboarding ?? Onboarding(); if keep { i.kept = true } else { i.candidate = true }; n.onboarding = i; return n }, haptic: true) } }
    private func move(_ delta: Int) {
        let index = max(0, min(5, (steps.firstIndex(of: intro.step) ?? 0) + delta))
        Task { _ = await app.mutate { s in var n = s; var i = n.onboarding ?? Onboarding(); i.step = steps[index]; n.onboarding = i; return n } }
    }
    private func advance() {
        if intro.step == "discover" && (billing.allowsPro || app.photos.isEmpty || !app.library.accessible) { Task { await app.finishOnboarding() }; return }
        if intro.step == "swipe" && app.library.accessible { move(2) } else { move(1) }
    }
}
struct SampleCard: View {
    var index: Int
    var body: some View {
        ZStack { LinearGradient(colors: [Color.cyan.opacity(0.6), Color.blue.opacity(0.7)], startPoint: .top, endPoint: .bottom); Circle().fill(Color.yellow.opacity(0.9)).frame(width: 48, height: 48).offset(x: 25, y: -45); Image(systemName: index == 2 ? "mountain.2.fill" : "leaf.fill").resizable().scaledToFit().foregroundStyle(Color.white.opacity(0.85)).padding(28).offset(y: 28) }.clipShape(RoundedRectangle(cornerRadius: 20))
    }
}
struct PaywallView: View {
    @Environment(\.dismiss) var dismiss
    var body: some View { ScrollView { PaywallContent(onFinish: { dismiss() }).padding(24) }.navigationTitle("PhotoSweep Pro").navigationBarTitleDisplayMode(.inline).toolbar { Button(L("close")) { dismiss() } } }
}
struct PaywallContent: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var billing: Billing
    @State private var selected: String?
    var onFinish: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Image(systemName: "sparkles").font(.system(size: 48)).foregroundStyle(.tint).frame(maxWidth: .infinity)
            Text(L("pro.headline")).font(.largeTitle.bold())
            Label(L("pro.unlimited"), systemImage: "checkmark.circle")
            Label(L("pro.compress"), systemImage: "checkmark.circle")
            Label(L("pro.filters"), systemImage: "checkmark.circle")
            if billing.allowsPro { Text(L("billing.active")); ActionButton(title: "continue", action: onFinish) }
            else if billing.pending { Text(L("billing.pending")); Button(L("billing.recheck")) { Task { await billing.refresh() } } }
            else {
                ForEach(billing.products, id: \.id) { product in
                    Button { selected = product.id; app.feedback() } label: {
                        HStack { Image(systemName: selected == product.id ? "checkmark.circle.fill" : "circle"); VStack(alignment: .leading, spacing: 6) { Text(L(product.id.hasSuffix("lifetime") ? "plan.lifetime" : "plan.monthly")).font(.headline); Text(product.displayPrice).font(.title2.bold()); Text(billing.disclosure(product)).font(.caption).multilineTextAlignment(.leading) }; Spacer() }.padding(16).background(Color.accentColor.opacity(selected == product.id ? 0.12 : 0.04), in: RoundedRectangle(cornerRadius: 16))
                    }.buttonStyle(.plain).accessibilityAddTraits(selected == product.id ? .isSelected : [])
                }
                if let product = billing.products.first(where: { $0.id == selected }) {
                    Text(billing.disclosure(product)).font(.footnote)
                    ActionButton(title: "billing.purchase") { Task { await billing.purchase(product); if billing.allowsPro { app.feedback(success: true); onFinish() } } }.disabled(billing.busy)
                } else { Text(L("billing.unavailable")).font(.footnote); Button(L("retry")) { Task { await billing.load() } } }
            }
            if let message = billing.message { Text(message).font(.footnote) }
            Button(L("billing.free"), action: onFinish).frame(maxWidth: .infinity, minHeight: 44)
            Button(L("billing.restore")) { Task { await billing.restore(); if billing.allowsPro { onFinish() } } }.disabled(billing.busy)
            Text(L("quota.policy")).font(.caption).foregroundStyle(.secondary)
            HStack { NavigationLink(L("legal.terms")) { HelpDetailView(kind: "terms") }; Spacer(); NavigationLink(L("legal.privacy")) { HelpDetailView(kind: "privacy") } }.font(.footnote)
        }.task { if billing.products.isEmpty { await billing.load() }; selected = billing.products.first?.id }
    }
}
