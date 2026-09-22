import Foundation

/// Monotonic foreground time; no assumed minutes saved or background time.
struct ReviewActivityClock {
    private var sessionID: String?
    private var started: Double?
    private var accumulated: Double = 0
    mutating func set(session: String?, active: Bool, now: Double) {
        if sessionID != session { sessionID = session; started = nil; accumulated = 0 }
        if let started { accumulated += max(0, now - started) }
        started = active && session != nil ? now : nil
    }
    func seconds(now: Double) -> Double { accumulated + (started.map { max(0, now - $0) } ?? 0) }
    mutating func acknowledge(_ seconds: Double, now: Double) {
        accumulated = max(0, self.seconds(now: now) - seconds)
        if started != nil { started = now }
    }
}

struct SuccessOfferRecord: Codable { var at: Double; var deletedCount: Int }
enum SuccessExperience {
    static func mayOffer(_ state: ReviewState, pro: Bool, pending: Bool, now: Double) -> Bool {
        guard !pro, !pending, state.deletion?.status == "done", let job = state.deletion,
              !job.deleted.isEmpty, let outcome = state.outcomes.first(where: { $0.id == job.id }),
              state.deletedCount >= 5 || outcome.knownBytes >= 100_000_000 else { return false }
        guard let last = state.successOffer else { return true }
        return now - last.at >= 7 * 86_400_000 && state.deletedCount >= last.deletedCount + 20
    }
    static func storageIncrease(_ outcome: Outcome) -> Double? {
        guard let before = outcome.freeBefore, let after = outcome.freeAfter,
              before.isFinite, after.isFinite, before >= 0, after >= 0 else { return nil }
        return max(0, after - before)
    }
    static func duration(_ seconds: Double) -> String {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = seconds >= 60 ? [.minute, .second] : [.second]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: max(1, seconds.rounded(.up))) ?? "—"
    }
}
