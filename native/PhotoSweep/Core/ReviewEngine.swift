import Foundation

enum ReviewEngine {
    static func remaining(_ state: ReviewState, _ kind: MediaKind) -> Int {
        max(0, (kind == .photo ? 30 : 5) - Set(state.used.filter { state.kind($0) == kind }).count)
    }
    static func refresh(_ state: ReviewState, _ clock: WallClock) -> ReviewState {
        var next = state
        let changedZone = clock.timezoneOffset != state.timezoneOffset
        let block = changedZone ? max(clock.day, state.blockResetThrough) : state.blockResetThrough
        if clock.now >= state.lastWallTime && !changedZone && clock.day > state.day && clock.day > block {
            next.day = clock.day; next.used = []
        }
        next.lastWallTime = max(clock.now, state.lastWallTime); next.timezoneOffset = clock.timezoneOffset; next.blockResetThrough = block
        return next
    }
    static func start(_ state: ReviewState, ids: [String], scope: Scope, pro: Bool, clock: WallClock = WallClock()) throws -> ReviewState {
        var next = refresh(state, clock); guard !next.locked else { throw ReviewFailure.locked }
        next.rememberSession()
        let allowed = Set(ids), used = Set(next.used)
        var budgets: [MediaKind: Int] = [.photo: remaining(next, .photo), .video: remaining(next, .video)]
        func eligible(_ id: String) -> Bool {
            guard allowed.contains(id), next.decisions[id] == nil else { return false }
            if pro || used.contains(id) { return true }
            let kind = next.kind(id), value = budgets[kind, default: 0]; budgets[kind] = value - 1; return value > 0
        }
        if var saved = next.monthSessions[scope.key], saved.status != "summary", saved.cursor < saved.ids.count, pro || saved.cursor < 20 {
            let pending = saved.ids.dropFirst(saved.cursor).filter(eligible).prefix(pro ? next.settings.batch : 20 - saved.cursor)
            if !pending.isEmpty {
                saved.ids = Array(saved.ids.prefix(saved.cursor)) + pending; saved.target = saved.ids.count; saved.status = "active"
                next.session = saved; next.rememberSession(); return next
            }
        }
        budgets = [.photo: remaining(next, .photo), .video: remaining(next, .video)]
        var seen = Set<String>()
        let fresh = ids.filter { seen.insert($0).inserted && next.decisions[$0] == nil }
        let selected = Array(fresh.filter(eligible).prefix(pro ? next.settings.batch : 20))
        guard !selected.isEmpty else { throw fresh.isEmpty ? ReviewFailure.empty : ReviewFailure.quota }
        next.session = Session(id: UUID().uuidString, ids: selected, cursor: 0, target: selected.count, scope: scope, startedAt: clock.now, status: "active", steps: [])
        next.rememberSession(); return next
    }
    static func decide(_ state: ReviewState, id: String, choice: Choice?, pro: Bool, clock: WallClock = WallClock()) throws -> ReviewState {
        var next = refresh(state, clock); guard !next.locked else { throw ReviewFailure.locked }
        guard var session = next.session, session.status != "summary", session.ids.indices.contains(session.cursor), session.ids[session.cursor] == id else { throw ReviewFailure.stale }
        let previous = next.decisions[id]
        if let choice {
            if !pro && previous == nil && !next.used.contains(id) {
                guard remaining(next, next.kind(id)) > 0 else { throw ReviewFailure.quota }; next.used.append(id)
            }
            next.decisions[id] = Decision(choice: choice, at: clock.now, sessionId: session.id)
        }
        session.steps.append(Step(id: id, previous: previous, choice: choice, cursor: session.cursor)); session.cursor += 1
        if session.cursor == session.ids.count {
            session.status = "summary"; next.history.removeAll { $0.id == session.id }
            next.history.append(HistoryItem(id: session.id, at: session.startedAt, kept: session.steps.filter { $0.choice == .keep }.count, candidates: session.steps.filter { $0.choice == .candidate }.count))
        }
        next.session = session; next.rememberSession(); return next
    }
    static func undo(_ state: ReviewState) throws -> ReviewState {
        guard !state.locked else { throw ReviewFailure.locked }
        var next = state; guard var session = next.session, let step = session.steps.popLast() else { return next }
        next.decisions[step.id] = step.previous; session.cursor = step.cursor; session.status = "active"
        next.history.removeAll { $0.id == session.id }; next.session = session; next.rememberSession(); return next
    }
    static func stage(_ state: ReviewState, ids: [String], pro: Bool, clock: WallClock = WallClock()) throws -> ReviewState {
        var next = refresh(state, clock); guard !next.locked else { throw ReviewFailure.locked }
        let unique = Set(ids); guard !unique.isEmpty else { throw ReviewFailure.empty }
        let fresh = unique.filter { next.decisions[$0] == nil && !next.used.contains($0) }
        for kind in [MediaKind.photo, .video] where !pro {
            guard fresh.filter({ next.kind($0) == kind }).count <= remaining(next, kind) else { throw ReviewFailure.quota }
        }
        for id in unique { next.decisions[id] = Decision(choice: .candidate, at: clock.now, sessionId: "selection-\(clock.now)") }
        if !pro { next.used += fresh }; return next
    }
    static func beginDeletion(_ state: ReviewState, ids: [String], free: Double?, clock: WallClock = WallClock()) throws -> ReviewState {
        guard !state.locked else { throw ReviewFailure.locked }
        let unique = Array(Set(ids)).sorted()
        guard !unique.isEmpty, unique.allSatisfy({ state.decisions[$0]?.choice == .candidate }) else { throw ReviewFailure.stale }
        var next = state
        next.deletion = DeletionJob(id: UUID().uuidString, ids: unique, at: clock.now, status: "pending", deleted: [], remaining: unique,
                                   snapshot: Dictionary(uniqueKeysWithValues: unique.map { ($0, DeletionItem(kind: state.kind($0), size: state.sizes[$0])) }), freeBefore: free)
        return next
    }
    static func reconcile(_ state: ReviewState, status: String, deleted: [String] = [], freeAfter: Double? = nil) throws -> ReviewState {
        var next = state; guard var job = state.deletion, state.locked else { return state }
        guard status == "confirmed" else { job.status = status == "cancelled" ? "cancelled" : "unknown"; next.deletion = job; return next }
        let ids = Set(deleted); guard ids.isSubset(of: Set(job.ids)) else { throw ReviewFailure.stale }
        for id in ids { next.decisions.removeValue(forKey: id) }
        next.deletedCount += ids.count
        var outcome = Outcome(id: job.id, at: job.at, photoCount: 0, videoCount: 0, knownBytes: 0, unknownCount: 0, estimated: false, freeBefore: job.freeBefore, freeAfter: freeAfter)
        for id in ids {
            let item = job.snapshot?[id]
            if (item?.kind ?? state.kind(id)) == .video { outcome.videoCount += 1 } else { outcome.photoCount += 1 }
            if let size = item?.size, let bytes = size.bytes, bytes.isFinite, bytes >= 0 {
                outcome.knownBytes += bytes; outcome.estimated = outcome.estimated || size.quality != "measured-resource"
            } else { outcome.unknownCount += 1 }
        }
        if !ids.isEmpty { next.outcomes.removeAll { $0.id == job.id }; next.outcomes.append(outcome) }
        func prune(_ session: Session) -> Session {
            var value = session; value.steps = []; value.cursor -= session.ids.prefix(session.cursor).filter { ids.contains($0) }.count
            value.ids.removeAll { ids.contains($0) }; value.status = "paused"; return value
        }
        next.monthSessions = next.monthSessions.mapValues(prune); next.session = next.session.map(prune)
        job.deleted = ids.sorted(); job.remaining = job.ids.filter { !ids.contains($0) }; job.status = job.remaining.isEmpty ? "done" : "partial"
        next.deletion = job; return next
    }
    static func mayRequestReview(_ state: ReviewState, version: String, clock: WallClock = WallClock()) -> Bool {
        let days = Set(state.outcomes.filter { $0.photoCount + $0.videoCount > 0 }.map { WallClock(date: Date(timeIntervalSince1970: $0.at / 1000)).day })
        guard days.count >= 2 else { return false }
        guard let last = state.reviewPrompt else { return true }
        return last.version != version && clock.now - last.at >= 120 * 86_400_000
    }
}
