import Foundation
import SQLite3

protocol ReviewPersistence { func load() async throws -> ReviewState; func save(_ state: ReviewState) async throws }

// Each connection stays on this actor. sqlite3_backup includes committed WAL pages.
actor SQLitePersistence: ReviewPersistence {
    let directory: URL
    let legacy: URL
    private var connection: OpaquePointer?
    init(documents: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]) {
        directory = documents.appendingPathComponent("PhotoSweepNative", isDirectory: true)
        legacy = documents.appendingPathComponent("SQLite/photosweep-v1.db")
    }
    deinit { if let connection { sqlite3_close(connection) } }
    private func open(_ url: URL, readOnly: Bool = false) throws -> OpaquePointer {
        var db: OpaquePointer?
        let flags = readOnly ? SQLITE_OPEN_READONLY : SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE
        guard sqlite3_open_v2(url.path, &db, flags | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK, let db else {
            if let db { sqlite3_close(db) }; throw ReviewFailure.storage
        }
        sqlite3_busy_timeout(db, 5000); return db
    }
    private func exec(_ sql: String, db: OpaquePointer) throws {
        guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else { throw ReviewFailure.storage }
    }
    private func value(_ sql: String, db: OpaquePointer) throws -> String? {
        var statement: OpaquePointer?; guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { throw ReviewFailure.storage }
        defer { sqlite3_finalize(statement) }
        let result = sqlite3_step(statement)
        if result == SQLITE_DONE { return nil }
        guard result == SQLITE_ROW, let text = sqlite3_column_text(statement, 0) else { throw ReviewFailure.storage }
        return String(cString: text)
    }
    private func write(_ state: ReviewState, db: OpaquePointer) throws {
        let json = String(data: try JSONEncoder().encode(state), encoding: .utf8)!
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, "INSERT INTO state(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", -1, &statement, nil) == SQLITE_OK else { throw ReviewFailure.storage }
        defer { sqlite3_finalize(statement) }
        let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
        guard sqlite3_bind_text(statement, 1, json, -1, transient) == SQLITE_OK, sqlite3_step(statement) == SQLITE_DONE else { throw ReviewFailure.storage }
    }
    func load() throws -> ReviewState {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let db: OpaquePointer
        if let connection { db = connection } else { db = try open(directory.appendingPathComponent("photosweep-v2.db")); connection = db }
        try exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS migration(id INTEGER PRIMARY KEY,source TEXT NOT NULL);", db: db)
        if let payload = try value("SELECT payload FROM state WHERE id=1", db: db) { return try Self.decode(Data(payload.utf8)) }
        // Never fall back to a blank state if an existing legacy database is unreadable.
        var imported = ReviewState()
        if FileManager.default.fileExists(atPath: legacy.path) {
            let source = try open(legacy, readOnly: true); defer { sqlite3_close(source) }
            let backupURL = directory.appendingPathComponent("legacy-consistent-backup.db")
            let backupDB = try open(backupURL); defer { sqlite3_close(backupDB) }
            guard let backup = sqlite3_backup_init(backupDB, "main", source, "main") else { throw ReviewFailure.migration }
            let step = sqlite3_backup_step(backup, -1); let finished = sqlite3_backup_finish(backup)
            guard step == SQLITE_DONE, finished == SQLITE_OK else { throw ReviewFailure.migration }
            guard let payload = try value("SELECT value FROM meta WHERE key='state'", db: backupDB) else { throw ReviewFailure.migration }
            guard var meta = try JSONSerialization.jsonObject(with: Data(payload.utf8)) as? [String: Any] else { throw ReviewFailure.migration }
            var statement: OpaquePointer?
            guard sqlite3_prepare_v2(backupDB, "SELECT id,choice,at,session_id FROM decisions", -1, &statement, nil) == SQLITE_OK else { throw ReviewFailure.migration }
            defer { sqlite3_finalize(statement) }
            var decisions: [String: Any] = [:]
            while true {
                let result = sqlite3_step(statement); if result == SQLITE_DONE { break }
                guard result == SQLITE_ROW, let id = sqlite3_column_text(statement, 0), let choice = sqlite3_column_text(statement, 1), let session = sqlite3_column_text(statement, 3) else { throw ReviewFailure.migration }
                decisions[String(cString: id)] = ["choice": String(cString: choice), "at": sqlite3_column_double(statement, 2), "sessionId": String(cString: session)]
            }
            meta["decisions"] = decisions; imported = try Self.decode(JSONSerialization.data(withJSONObject: meta))
        }
        try exec("BEGIN IMMEDIATE", db: db)
        do {
            try write(imported, db: db)
            try exec("INSERT INTO migration(id,source) VALUES(1,'legacy-v1-or-v2'); COMMIT", db: db)
        } catch { try? exec("ROLLBACK", db: db); throw error }
        return imported
    }
    func save(_ state: ReviewState) throws {
        guard let db = connection else { throw ReviewFailure.storage }
        try exec("BEGIN IMMEDIATE", db: db)
        do { try write(state, db: db); try exec("COMMIT", db: db) }
        catch { try? exec("ROLLBACK", db: db); throw error }
    }
    static func decode(_ data: Data) throws -> ReviewState {
        guard var json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let version = json["version"] as? Int,
              [1, 2].contains(version), json["used"] is [String], json["settings"] is [String: Any], json["history"] is [Any] else { throw ReviewFailure.migration }
        let defaults: [String: Any] = ["mediaKinds": [:], "monthSessions": [:], "monthHintSeen": false, "sizes": [:], "outcomes": []]
        for (key, value) in defaults where json[key] == nil { json[key] = value }
        if version == 1 {
            json["mediaKinds"] = Dictionary(uniqueKeysWithValues: Set(json["used"] as! [String]).map { ($0, "photo") })
            json["version"] = 2
        }
        var state = try JSONDecoder().decode(ReviewState.self, from: JSONSerialization.data(withJSONObject: json))
        guard state.lastWallTime.isFinite, state.lastWallTime > 1_000_000_000_000, (0...100).contains(state.settings.batch), state.deletedCount >= 0 else { throw ReviewFailure.migration }
        for session in Array(state.monthSessions.values) + [state.session].compactMap({ $0 }) {
            guard session.cursor >= 0, session.cursor <= session.ids.count else { throw ReviewFailure.migration }
        }
        if version == 1 { state.rememberSession() }
        return state
    }
}
