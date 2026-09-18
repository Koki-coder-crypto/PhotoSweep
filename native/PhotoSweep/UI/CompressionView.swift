import SwiftUI

protocol CompressionAdapter {
    func status() -> [String: Any]
    func start(_ assetId: String, preset: String) throws -> [String: Any]
    func save(_ id: String) throws -> [String: Any]
    func cancel()
}
extension PhotoSweepCompression: CompressionAdapter {}

struct CompressionView: View {
    @EnvironmentObject var app: AppModel
    @EnvironmentObject var billing: Billing
    @Environment(\.dismiss) var dismiss
    var assetId: String
    @State private var preset = "1080"
    @State private var job: [String: Any] = [:]
    private var phase: String { job["phase"] as? String ?? "idle" }
    private var active: Bool { ["preparing", "encoding", "saving"].contains(phase) }
    private var same: Bool { job["assetId"] as? String == assetId }
    var body: some View {
        ScrollView { VStack(alignment: .leading, spacing: 20) {
            Text(L("pro.feature")).font(.caption.bold()).foregroundStyle(.tint)
            Text(L("compression.detail")).foregroundStyle(.secondary)
            MediaPlayerView(id: assetId)
            Picker(L("compression.quality"), selection: $preset) { Text(L("compression.1080")).tag("1080"); Text(L("compression.720")).tag("720") }.pickerStyle(.segmented).disabled(active)
            Text(L("compression.supported")).font(.footnote)
            if !same && ["preparing", "encoding", "saving", "unknown"].contains(phase) { Text(L("compression.previous")); NavigationLink(L("compression.previousOpen")) { CompressionView(assetId: job["assetId"] as? String ?? "") } }
            else if active {
                Text(L("compression.\(phase)")).font(.headline)
                ProgressView(value: job["progress"] as? Double ?? 0)
                Text(L("compression.foreground")).font(.footnote)
                if phase != "saving" { Button(L("compression.cancel")) { app.compression.cancel(); refresh() } }
            } else if phase == "unknown" { Text(L("compression.unknown")); Button(L("compression.recheck")) { refresh() } }
            else if same && ["ready", "saved", "not-smaller"].contains(phase) {
                Panel {
                    Text(L("compression.compare")).font(.title2.bold())
                    HStack { Text(bytesText(job["inputBytes"] as? Double ?? 0)); Image(systemName: "arrow.right"); Text(bytesText(job["outputBytes"] as? Double ?? 0)) }.font(.title3.bold())
                    if let uri = job["outputUri"] as? String, let url = URL(string: uri) { MediaPlayerView(id: nil, url: url) }
                }
                if phase == "ready" { ActionButton(title: "compression.save") { perform { try app.compression.save(job["id"] as? String ?? "") } } }
                if phase == "not-smaller" { Text(L("compression.not-smaller")) }
                if phase == "saved", job["savedId"] as? String != nil {
                    Text(L("compression.saved")).font(.headline); Text(L("compression.bothNote"))
                    ActionButton(title: "compression.stageOriginal") { Task { if await app.stage([assetId]) { app.reload(); app.tab = 2; dismiss() } } }
                    Button(L("compression.keepBoth")) { app.reload(); dismiss() }.frame(minHeight: 44)
                }
            } else {
                if let message = job["message"] as? String, !message.isEmpty, same { Text(message).font(.footnote) }
                ActionButton(title: billing.allowsPro ? "compression.begin" : "compression.pro") {
                    if billing.allowsPro { perform { try app.compression.start(assetId, preset: preset) } } else { app.paywall = true }
                }
            }
        }.padding(20) }.navigationTitle(L("category.compression")).navigationBarTitleDisplayMode(.inline)
            .task { while !Task.isCancelled { refresh(); try? await Task.sleep(nanoseconds: 300_000_000) } }
    }
    private func refresh() { job = app.compression.status() }
    private func perform(_ work: () throws -> [String: Any]) { do { job = try work() } catch { app.error = error.localizedDescription } }
}
