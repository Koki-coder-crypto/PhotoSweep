import Foundation

enum MediaKind: String, Codable { case photo, video }
enum Choice: String, Codable { case keep, candidate }
struct Decision: Codable, Equatable { var choice: Choice; var at: Double; var sessionId: String }
struct Scope: Codable, Equatable {
    var month: String?; var screenshotsOnly: Bool?; var mediaKind: MediaKind?; var recordingsOnly: Bool?
    var start: Double?; var end: Double?; var order = "newest"
    var key: String {
        let values: [Any] = [month ?? "", mediaKind?.rawValue ?? "", screenshotsOnly ?? false,
                             recordingsOnly ?? false, start.map { $0 as Any } ?? NSNull(), end.map { $0 as Any } ?? NSNull(), order]
        return String(data: try! JSONSerialization.data(withJSONObject: values, options: [.fragmentsAllowed, .withoutEscapingSlashes]), encoding: .utf8)!
    }
}
struct Step: Codable { var id: String; var previous: Decision?; var choice: Choice?; var cursor: Int }
struct Session: Codable, Identifiable {
    var id: String; var ids: [String]; var cursor: Int; var target: Int; var scope: Scope
    var startedAt: Double; var status: String; var steps: [Step]
    var activeSeconds: Double?; var timedReviewCount: Int?
}
struct AssetSize: Codable {
    var bytes: Double?; var quality: String; var basis: String; var modifiedAt: Double
}
struct DeletionItem: Codable { var kind: MediaKind; var size: AssetSize? }
struct DeletionJob: Codable {
    var id: String; var ids: [String]; var at: Double; var status: String
    var deleted: [String]; var remaining: [String]; var snapshot: [String: DeletionItem]?; var freeBefore: Double?
}
struct Outcome: Codable, Identifiable {
    var id: String; var at: Double; var photoCount: Int; var videoCount: Int
    var knownBytes: Double; var unknownCount: Int; var estimated: Bool; var freeBefore: Double?; var freeAfter: Double?
}
struct HistoryItem: Codable, Identifiable {
    var id: String; var at: Double; var kept: Int; var candidates: Int
    var activeSeconds: Double?; var timedReviewCount: Int?
}
struct Settings: Codable {
    var haptics = true; var sound = false; var reduceMotion = false; var weekly = false
    var trialReminder = false; var batch = 20
}
struct Onboarding: Codable {
    var version = 2; var step = "welcome"; var completed = false; var mode = "first"
    var selected: [Int] = []; var compared = false; var kept = false; var candidate = false; var homeHintSeen = false
}
struct ReviewPrompt: Codable { var at: Double; var version: String }
struct ReviewState: Codable {
    var version = 2
    var mediaKinds: [String: MediaKind] = [:]; var monthSessions: [String: Session] = [:]
    var monthHintSeen = false; var sizes: [String: AssetSize] = [:]; var outcomes: [Outcome] = []
    var reviewPrompt: ReviewPrompt?; var onboarding: Onboarding?
    var successOffer: SuccessOfferRecord?
    var onboarded = false; var guided = false; var decisions: [String: Decision] = [:]
    var day: String; var lastWallTime: Double; var timezoneOffset: Int; var blockResetThrough = ""
    var used: [String] = []; var quotaNoticeDay = ""; var session: Session?; var deletion: DeletionJob?
    var settings = Settings(); var deletedCount = 0; var history: [HistoryItem] = []
    init(clock: WallClock = WallClock()) {
        day = clock.day; lastWallTime = clock.now; timezoneOffset = clock.timezoneOffset
    }
    var locked: Bool { ["pending", "unknown"].contains(deletion?.status ?? "") }
    var needsOnboarding: Bool { !(onboarding?.completed ?? onboarded) }
    func kind(_ id: String) -> MediaKind { mediaKinds[id] ?? .photo }
    var candidates: [String] { decisions.filter { $0.value.choice == .candidate }.map(\.key).sorted() }
    mutating func rememberSession() { if let session { monthSessions[session.scope.key] = session } }
}
struct WallClock {
    var now: Double; var day: String; var timezoneOffset: Int
    init(date: Date = Date(), timezone: TimeZone = .current) {
        now = date.timeIntervalSince1970 * 1000
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian); formatter.timeZone = timezone; formatter.dateFormat = "yyyy-MM-dd"
        day = formatter.string(from: date)
        timezoneOffset = -timezone.secondsFromGMT(for: date) / 60 // JavaScript getTimezoneOffset convention.
    }
    init(now: Double, day: String, timezoneOffset: Int) { self.now = now; self.day = day; self.timezoneOffset = timezoneOffset }
}
enum ReviewFailure: String, Error, LocalizedError {
    case quota, busy, empty, stale, locked, storage, migration, unavailable
    var errorDescription: String? { L("error.\(rawValue)") }
}
struct MediaItem: Identifiable, Equatable {
    var id: String; var kind: MediaKind; var createdAt: Double; var width: Int; var height: Int
    var duration: Double; var screenshot: Bool; var recording: Bool; var favorite: Bool; var modifiedAt: Double
    var month: String {
        let parts = Calendar(identifier: .gregorian).dateComponents([.year, .month], from: Date(timeIntervalSince1970: createdAt / 1000))
        return String(format: "%04d-%02d", parts.year ?? 1970, parts.month ?? 1)
    }
}
func L(_ key: String) -> String { NSLocalizedString(key, comment: "") }
func bytesText(_ value: Double) -> String { ByteCountFormatter.string(fromByteCount: Int64(max(0, value)), countStyle: .decimal) }
