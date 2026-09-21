import SwiftUI
import PhotosUI

struct SettingsView: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var billing: Billing
    @State private var reset = false
    var body: some View { Form {
        Section {
            NavigationLink(L("plan.title")) { PlanView() }
            Button(L("intro.replay")) { Task { if await app.mutate({ s in var n = s; var i = Onboarding(); i.mode = "replay"; i.homeHintSeen = true; n.onboarding = i; return n }) { app.replay = true } } }
            NavigationLink(L("history.title")) { HistoryView() }
        }
        Section(L("settings.feedback")) {
            Toggle(L("settings.haptics"), isOn: binding(\.haptics))
            Toggle(L("settings.sound"), isOn: binding(\.sound))
            Toggle(L("settings.reduceMotion"), isOn: binding(\.reduceMotion))
            Button(L("settings.testHaptic")) { app.feedback() }
            Picker(L("settings.batch"), selection: Binding(get: { app.state.settings.batch }, set: { value in if billing.allowsPro { Task { await app.settings { $0.batch = value } } } else { app.paywall = true } })) { ForEach([20, 50, 100], id: \.self) { Text("\($0)").tag($0) } }
        }
        Section(L("settings.notifications")) { Toggle(L("settings.weekly"), isOn: binding(\.weekly)); Toggle(L("settings.trialReminder"), isOn: binding(\.trialReminder)) }
        Section(L("permission.title")) {
            Text(L(app.permission == .limited ? "permission.limited" : app.library.accessible ? "permission.full" : "permission.denied"))
            Button(L("permission.settings")) { UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!) }
            if app.permission == .limited { LimitedLibraryButton().frame(minHeight: 44) }
        }
        Section {
            NavigationLink(L("help.title")) { HelpView() }
            NavigationLink(L("legal.privacy")) { HelpDetailView(kind: "privacy") }
            NavigationLink(L("legal.terms")) { HelpDetailView(kind: "terms") }
            LabeledContent(L("settings.version"), value: "2.0.0")
        }
        #if DEBUG
        Section { NavigationLink("Development catalog") { CatalogView() } }
        #endif
    }.disabled(app.busy).navigationTitle(L("settings.title")) }
    private func binding(_ path: WritableKeyPath<Settings, Bool>) -> Binding<Bool> { Binding(get: { app.state.settings[keyPath: path] }, set: { value in Task { await app.settings { $0[keyPath: path] = value } } }) }
}
struct PlanView: View {
    @EnvironmentObject var billing: Billing
    @EnvironmentObject var app: AppModel
    var body: some View { Form {
        Section { Text(L(billing.entitlementName)).font(.title2.bold()); if let expiry = billing.expiry { Text(expiry, style: .date); Text(L(billing.autoRenew ? "plan.renews" : "plan.ends")) }; QuotaLabel() }
        Section { if !billing.allowsPro { Button(L("pro.see")) { app.paywall = true } }; Button(L("billing.restore")) { Task { await billing.restore() } }; Button(L("plan.manage")) { Task { await billing.manage() } } }
        if let message = billing.message { Text(message) }
    }.navigationTitle(L("plan.title")) }
}
struct HistoryView: View {
    @EnvironmentObject var app: AppModel
    @State private var confirm = false
    var body: some View { List {
        if app.state.history.isEmpty { Text(L("history.empty")) }
        ForEach(app.state.history.reversed()) { item in VStack(alignment: .leading, spacing: 8) { Text(Date(timeIntervalSince1970: item.at / 1000), style: .date).font(.headline); Text(String(format: L("summary.counts"), item.kept, item.candidates)) } }
        Button(L("history.reset"), role: .destructive) { confirm = true }
    }.navigationTitle(L("history.title")).confirmationDialog(L("history.resetDetail"), isPresented: $confirm) { Button(L("history.reset"), role: .destructive) { Task { _ = await app.mutate { s in var n = s; n.history = []; return n } } } } }
}
struct HelpView: View {
    var body: some View { List {
        NavigationLink(L("swipe.help")) { HelpDetailView(kind: "swipe") }
        NavigationLink(L("restore.title")) { HelpDetailView(kind: "restore") }
        NavigationLink(L("permission.title")) { HelpDetailView(kind: "permission") }
        NavigationLink(L("plan.title")) { PlanView() }
        Link(destination: URL(string: "mailto:photosweep.support@gmail.com")!) {
            VStack(alignment: .leading, spacing: 4) {
                Text(L("contact.email"))
                Text("photosweep.support@gmail.com").font(.footnote).textSelection(.enabled)
            }
        }
    }.navigationTitle(L("help.title")) }
}
struct HelpDetailView: View {
    var kind: String
    var body: some View { ScrollView { VStack(alignment: .leading, spacing: 24) {
        Text(L("help.\(kind).title")).font(.largeTitle.bold())
        Text(L("help.\(kind).body"))
        if kind == "privacy" || kind == "terms" {
            let language = Bundle.main.preferredLocalizations.first == "ja" ? "ja" : "en"
            Link(L("legal.web"), destination: URL(string: "https://koki-coder-crypto.github.io/PhotoSweep/\(language)/\(kind).html")!)
        }
        if kind == "terms" { Link(L("legal.apple"), destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!) }
        if kind == "restore" { Link(L("restore.apple"), destination: URL(string: "https://support.apple.com/104967")!) }
    }.padding(24) }.navigationBarTitleDisplayMode(.inline) }
}
struct LimitedLibraryButton: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController { let controller = LimitedLibraryController(); return controller }
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
final class LimitedLibraryController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad(); let button = UIButton(type: .system); button.setTitle(L("permission.more"), for: .normal)
        button.addTarget(self, action: #selector(choose), for: .touchUpInside); button.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(button)
        NSLayoutConstraint.activate([button.leadingAnchor.constraint(equalTo: view.leadingAnchor), button.trailingAnchor.constraint(equalTo: view.trailingAnchor), button.topAnchor.constraint(equalTo: view.topAnchor), button.bottomAnchor.constraint(equalTo: view.bottomAnchor), button.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)])
    }
    @objc func choose() { PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: self) }
}
#if DEBUG
struct CatalogView: View {
    var body: some View { List {
        NavigationLink("Home") { HomeView() }; NavigationLink("Swipe") { SwipeView() }; NavigationLink("Candidates") { CandidatesView() }
        NavigationLink("Onboarding") { OnboardingView() }; NavigationLink("Paywall") { PaywallView() }; NavigationLink("Result") { ResultView() }
        ForEach([Category.similar, .duplicate, .videos, .recordings, .screenshots, .compression, .all], id: \.self) { category in NavigationLink(L(category.title)) { CollectionView(category: category) } }
    }.navigationTitle("Development catalog") }
}
#endif
