import type {
  ReviewPersistence,
  ReviewState,
  Decision,
} from "../domain/types.ts";
export type SqlValue = string | number | null;
export interface SqlConnection {
  exec(sql: string): Promise<void>;
  run(sql: string, params: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  transaction(work: (tx: SqlConnection) => Promise<void>): Promise<void>;
}
export const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS decisions (id TEXT PRIMARY KEY NOT NULL, choice TEXT NOT NULL CHECK(choice IN ('keep','candidate')), at REAL NOT NULL, session_id TEXT NOT NULL);
PRAGMA user_version = 1;
`;
export class SqlReviewPersistence implements ReviewPersistence {
  constructor(private db: SqlConnection) {}
  async init() {
    await this.db.exec(SCHEMA);
  }
  async load(): Promise<ReviewState | null> {
    const [row] = await this.db.all<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'state'",
    );
    if (!row) return null;
    const meta = JSON.parse(row.value) as ReviewState;
    if (
      meta.version !== 1 ||
      !Array.isArray(meta.used) ||
      !meta.settings ||
      !Array.isArray(meta.history)
    )
      throw new Error(
        "保存データを読み込めませんでした。記録を消さずに、もう一度お試しください。",
      );
    const rows = await this.db.all<{
      id: string;
      choice: Decision["choice"];
      at: number;
      session_id: string;
    }>("SELECT * FROM decisions");
    return {
      ...meta,
      decisions: Object.fromEntries(
        rows.map((r) => [
          r.id,
          { choice: r.choice, at: r.at, sessionId: r.session_id },
        ]),
      ),
    };
  }
  async save(previous: ReviewState, next: ReviewState) {
    await this.db.transaction(async (tx) => {
      for (const id of Object.keys(previous.decisions))
        if (!next.decisions[id])
          await tx.run("DELETE FROM decisions WHERE id = ?", [id]);
      for (const [id, d] of Object.entries(next.decisions)) {
        if (d === previous.decisions[id]) continue;
        await tx.run(
          "INSERT INTO decisions(id,choice,at,session_id) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET choice=excluded.choice,at=excluded.at,session_id=excluded.session_id",
          [id, d.choice, d.at, d.sessionId],
        );
      }
      const { decisions: _, ...meta } = next;
      await tx.run(
        "INSERT INTO meta(key,value) VALUES('state',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [JSON.stringify(meta)],
      );
    });
  }
}
