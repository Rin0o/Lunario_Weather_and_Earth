/**
 * A minimal D1 stand-in over Node's built-in SQLite, running the real migrations, so the
 * store's SQL is tested as written. Only what D1Store uses is implemented.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export function fakeD1(): D1Database {
  const sqlite = new DatabaseSync(':memory:');
  const dir = new URL('../../migrations/', import.meta.url);
  for (const file of readdirSync(dir).sort()) {
    sqlite.exec(readFileSync(new URL(file, dir), 'utf8'));
  }

  const statement = (sql: string, params: SQLInputValue[] = []) => ({
    bind: (...values: SQLInputValue[]) => statement(sql, values),
    first: <T>() => Promise.resolve((sqlite.prepare(sql).get(...params) ?? null) as T | null),
    all: <T>() => Promise.resolve({ results: sqlite.prepare(sql).all(...params) as T[] }),
    run: () => {
      sqlite.prepare(sql).run(...params);
      return Promise.resolve({ success: true });
    },
  });

  return { prepare: (sql: string) => statement(sql) } as unknown as D1Database;
}
