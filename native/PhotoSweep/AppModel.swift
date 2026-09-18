import SwiftUI
import Photos
import StoreKit
import UserNotifications

@MainActor final class AppModel: ObservableObject {
    @Published var state = ReviewState()
    @Published var ready = false
    @Published var busy = false
    @Published var error: String?
    @Published var fatal: String?
    @Published var photos: [MediaItem] = []
    @Published var loading = false
    @Published var analyzing = false
    @Published var analysisComplete = false
    @Published var groups: [PhotoGroup] = []
    @Published var permission = PHAuthorizationStatus.notDetermined
    @Published var freeBytes: Double?
    @Published var totalBytes: Double?
    @Published var tab = 0
    @Published var paywall = false
    @Published var showResult = false
    @Published var replay = false
    let library = PhotoLibrary()
    let billing = Billing()
    let persistence: any ReviewPersistence
    let analysis = AnalysisService()
    let compression = PhotoSweepCompression()
    let feedbackService = FeedbackService()
    private var loadTask: Task<Void, Never>?
    private var generation = UUID()
    init(persistence: any ReviewPersistence = SQLitePersistence()) {
        self.persistence = persistence
        library.changed = { [weak self] in self?.reload() }
    }
    func launch() async {
        guard !ready else { return }
        do { state = try await persistence.load(); ready = true; fatal = nil; reload(); await billing.load() }
        catch { fatal = L("error.migration") }
    }
    @discardableResult func mutate(_ transform: (ReviewState) throws -> ReviewState, haptic: Bool = false) async -> Bool {
        guard ready, !busy else { return false }; busy = true; defer { busy = false }
        do {
            var next = try transform(state); next.rememberSession()
            try await persistence.save(next); state = next
            if haptic { feedback() }; return true
        } catch ReviewFailure.quota { paywall = true; return false }
        catch { self.error = error.localizedDescription; return false }
    }
    func feedback(success: Bool = false) {
        feedbackService.play(state.settings, success: success)
    }
    func reload() {
        loadTask?.cancel(); generation = UUID(); let token = generation
        loadTask = Task {
            permission = library.permission; loading = true; analysisComplete = false; groups = []
            defer { if generation == token { loading = false; analyzing = false } }
            storage()
            guard library.accessible else { photos = []; return }
            var all: [MediaItem] = [], offset = 0
            do {
                while !Task.isCancelled {
                    let page = try await library.page(offset: offset, count: 250)
                    guard generation == token else { return }
                    all += page; photos = all; offset += page.count
                    if page.count < 250 { break }
                }
                guard !Task.isCancelled else { return }
                loading = false
                // Kind mapping must be durable before the first quota-bearing operation.
                _ = await mutate { s in var n = s; for photo in all { n.mediaKinds[photo.id] = photo.kind }; return n }
                analyzing = true
                let found = await analysis.groups(all)
                guard generation == token, !Task.isCancelled else { return }
                groups = found; analyzing = false; analysisComplete = true
            } catch { self.error = L("library.failed") }
        }
    }
    func storage() {
        let values = try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())
        freeBytes = (values?[.systemFreeSize] as? NSNumber)?.doubleValue
        totalBytes = (values?[.systemSize] as? NSNumber)?.doubleValue
    }
    func requestPhotos() async { permission = await library.requestPermission(); reload() }
    func matching(_ scope: Scope) -> [MediaItem] {
        let list = photos.filter { photo in
            (scope.month == nil || scope.month == photo.month) && (scope.mediaKind == nil || scope.mediaKind == photo.kind)
            && (scope.screenshotsOnly != true || photo.screenshot) && (scope.recordingsOnly != true || photo.recording)
            && (scope.start == nil || photo.createdAt >= scope.start!) && (scope.end == nil || photo.createdAt < scope.end!)
        }
        return scope.order == "oldest" ? list.reversed() : list
    }
    func begin(_ scope: Scope) async {
        let items = matching(scope), pro = billing.hasPro
        if await mutate({ s in
            var next = s; for item in items { next.mediaKinds[item.id] = item.kind }
            return try ReviewEngine.start(next, ids: items.map(\.id), scope: scope, pro: pro)
        }) { tab = 1 }
    }
    func decide(_ id: String, choice: Choice?) async -> Bool {
        let pro = billing.hasPro
        let ok = await mutate({ try ReviewEngine.decide($0, id: id, choice: choice, pro: pro) }, haptic: choice != nil)
        if let session = state.session { library.prefetch(Array(session.ids.dropFirst(session.cursor).prefix(3))) }
        return ok
    }
    func stage(_ ids: [String]) async -> Bool {
        let pro = billing.hasPro
        return await mutate({ s in
            var next = s
            for item in self.photos where ids.contains(item.id) { next.mediaKinds[item.id] = item.kind }
            return try ReviewEngine.stage(next, ids: ids, pro: pro)
        }, haptic: true)
    }
    func measure(_ ids: [String]) async {
        for id in ids {
            if Task.isCancelled { return }
            let modified = photos.first { $0.id == id }?.modifiedAt
            if let cached = state.sizes[id], cached.bytes != nil, cached.modifiedAt == modified { continue }
            guard let size = await library.size(id) else { continue }
            while busy && !Task.isCancelled { try? await Task.sleep(nanoseconds: 50_000_000) }
            _ = await mutate { s in var next = s; next.sizes[id] = size; return next }
        }
    }
    func deleteCandidates(_ ids: [String]) async {
        storage()
        guard await mutate({ try ReviewEngine.beginDeletion($0, ids: ids, free: self.freeBytes) }) else { return }
        // Durable intent exists before PhotoKit is invoked. No relaunch invokes this automatically.
        busy = true
        let result = await library.delete(ids)
        busy = false; storage()
        let ok = await mutate { try ReviewEngine.reconcile($0, status: result, deleted: result == "confirmed" ? ids : [], freeAfter: self.freeBytes) }
        if ok { showResult = true; if result == "confirmed" { feedback(success: true) }; reload() }
    }
    func reconcileDeletion() async {
        guard let job = state.deletion, state.locked else { return }
        guard let missing = library.missing(job.ids), !missing.isEmpty else { error = L("delete.uncertain"); return }
        _ = await mutate { try ReviewEngine.reconcile($0, status: "confirmed", deleted: missing) }
        reload()
    }
    func finishOnboarding() async {
        if await mutate({ s in var n = s; n.onboarded = true; n.guided = true; var intro = n.onboarding ?? Onboarding(); intro.completed = true; n.onboarding = intro; return n }) { replay = false }
    }
    func settings(_ change: (inout Settings) -> Void) async {
        var updated = state.settings; change(&updated)
        if await mutate({ s in var n = s; n.settings = updated; return n }) { await syncNotifications() }
    }
    func syncNotifications() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["photosweep-weekly", "photosweep-trial"])
        guard state.settings.weekly || state.settings.trialReminder else { return }
        guard (try? await center.requestAuthorization(options: [.alert, .badge])) == true else { return }
        if state.settings.weekly {
            let content = UNMutableNotificationContent(); content.title = L("notification.weeklyTitle"); content.body = L("notification.weeklyBody")
            try? await center.add(UNNotificationRequest(identifier: "photosweep-weekly", content: content, trigger: UNCalendarNotificationTrigger(dateMatching: DateComponents(hour: 19, minute: 0, weekday: 1), repeats: true)))
        }
        if state.settings.trialReminder, billing.trial, billing.autoRenew, let end = billing.expiry {
            let at = end.addingTimeInterval(-48 * 3600)
            if at > Date() {
                let content = UNMutableNotificationContent(); content.title = L("notification.trialTitle"); content.body = L("notification.trialBody")
                try? await center.add(UNNotificationRequest(identifier: "photosweep-trial", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: at.timeIntervalSinceNow, repeats: false)))
            }
        }
    }
}
