/** Subscriptions and seen sea warnings in Cloudflare D1 (D-33, D-37). */
import type { WarningLevel } from '../../app/src/sea/seaForecast.ts';
import type { Language, Subscription } from './subscription.ts';

/** A cap on rows, so an abuser cannot fill the free D1 database. */
export const MAX_SUBSCRIPTIONS = 2000;

export interface Store {
  list(): Promise<Subscription[]>;
  remove(endpoint: string): Promise<void>;
}

/** A sea agitation warning seen in IPMA's file (local times without a zone). */
export interface SeenWarning {
  area: string;
  level: WarningLevel;
  start: string;
  end: string;
}

export interface SeenStore {
  listSeen(): Promise<SeenWarning[]>;
  /** Records warnings as seen; a warning seen again keeps its latest end. */
  saveSeen(warnings: readonly SeenWarning[]): Promise<void>;
  /** Forgets the warnings that ended before `localTime`. */
  forgetSeenBefore(localTime: string): Promise<void>;
}

interface Row {
  endpoint: string;
  p256dh: string;
  auth: string;
  latitude: number | null;
  longitude: number | null;
  crops: string;
  language: string;
  sea_area: string | null;
  sea_yellow: number;
}

function parseCrops(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export class D1Store implements Store, SeenStore {
  private readonly db: D1Database;
  constructor(db: D1Database) {
    this.db = db;
  }

  async count(): Promise<number> {
    const row = await this.db
      .prepare('SELECT COUNT(*) AS n FROM subscriptions')
      .first<{ n: number }>();
    return row?.n ?? 0;
  }

  async has(endpoint: string): Promise<boolean> {
    const row = await this.db
      .prepare('SELECT 1 AS found FROM subscriptions WHERE endpoint = ?')
      .bind(endpoint)
      .first();
    return row !== null;
  }

  /** Inserts or replaces the subscription for this endpoint. */
  async save(sub: Subscription, now: Date): Promise<void> {
    const stamp = now.toISOString();
    await this.db
      .prepare(
        `INSERT INTO subscriptions
           (endpoint, p256dh, auth, latitude, longitude, crops, language, sea_area, sea_yellow,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
           p256dh = excluded.p256dh, auth = excluded.auth,
           latitude = excluded.latitude, longitude = excluded.longitude,
           crops = excluded.crops, language = excluded.language,
           sea_area = excluded.sea_area, sea_yellow = excluded.sea_yellow,
           updated_at = excluded.updated_at`,
      )
      .bind(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        sub.frost?.latitude ?? null,
        sub.frost?.longitude ?? null,
        JSON.stringify(sub.frost?.crops ?? []),
        sub.language,
        sub.sea?.area ?? null,
        sub.sea?.yellow ? 1 : 0,
        stamp,
        stamp,
      )
      .run();
  }

  async remove(endpoint: string): Promise<void> {
    await this.db.prepare('DELETE FROM subscriptions WHERE endpoint = ?').bind(endpoint).run();
  }

  async get(endpoint: string): Promise<Subscription | null> {
    const row = await this.db.prepare(`${SELECT} WHERE endpoint = ?`).bind(endpoint).first<Row>();
    return row ? fromRow(row) : null;
  }

  async list(): Promise<Subscription[]> {
    const { results } = await this.db.prepare(SELECT).all<Row>();
    return results.map(fromRow);
  }

  async listSeen(): Promise<SeenWarning[]> {
    const { results } = await this.db
      .prepare('SELECT area, level, start, end_time AS "end" FROM sea_warnings_seen')
      .all<SeenWarning>();
    return results;
  }

  async saveSeen(warnings: readonly SeenWarning[]): Promise<void> {
    for (const w of warnings) {
      await this.db
        .prepare(
          `INSERT INTO sea_warnings_seen (area, level, start, end_time) VALUES (?, ?, ?, ?)
           ON CONFLICT(area, level, start) DO UPDATE SET end_time = excluded.end_time`,
        )
        .bind(w.area, w.level, w.start, w.end)
        .run();
    }
  }

  async forgetSeenBefore(localTime: string): Promise<void> {
    await this.db.prepare('DELETE FROM sea_warnings_seen WHERE end_time < ?').bind(localTime).run();
  }
}

const SELECT =
  'SELECT endpoint, p256dh, auth, latitude, longitude, crops, language, sea_area, sea_yellow FROM subscriptions';

function fromRow(r: Row): Subscription {
  return {
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
    language: (r.language === 'en' ? 'en' : 'pt-PT') as Language,
    frost:
      r.latitude === null || r.longitude === null
        ? null
        : { latitude: r.latitude, longitude: r.longitude, crops: parseCrops(r.crops) },
    sea: r.sea_area === null ? null : { area: r.sea_area, yellow: r.sea_yellow === 1 },
  };
}
