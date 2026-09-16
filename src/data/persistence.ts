import * as SQLite from "expo-sqlite";
import { SqlReviewPersistence, type SqlConnection, type SqlValue } from "./sql";
function connection(db: SQLite.SQLiteDatabase): SqlConnection {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params) => {
      await db.runAsync(sql, params);
    },
    all: <T>(sql: string, params: SqlValue[] = []) =>
      db.getAllAsync<T>(sql, params),
    transaction: async (work) => {
      await db.withExclusiveTransactionAsync(async (tx) => {
        await work(connection(tx));
      });
    },
  };
}
export async function createPersistence() {
  const db = await SQLite.openDatabaseAsync("photosweep-v1.db");
  const persistence = new SqlReviewPersistence(connection(db));
  await persistence.init();
  return persistence;
}
