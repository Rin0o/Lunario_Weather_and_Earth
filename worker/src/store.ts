/** Subscriptions in Cloudflare D1 (D-33). */
import type { Store } from './alerts.ts';
import type { Language, Subscription } from './subscription.ts';

/** A cap on rows, so an abuser cannot fill the free D1 database. */
export const MAX_SUBSCRIPTIONS = 2000;

interface Row {
  endpoint: string;
  p256dh: string;
  auth: string;
  latitude: number;
  longitude: number;
  crops: string;
  language: string;
}

function parseCrops(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export class D1Store implements Store {
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
           (endpoint, p256dh, auth, latitude, longitude, crops, language, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
           p256dh = excluded.p256dh, auth = excluded.auth,
           latitude = excluded.latitude, longitude = excluded.longitude,
           crops = excluded.crops, language = excluded.language,
           updated_at = excluded.updated_at`,
      )
      .bind(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        sub.latitude,
        sub.longitude,
        JSON.stringify(sub.crops),
        sub.language,
        stamp,
        stamp,
      )
      .run();
  }

  async remove(endpoint: string): Promise<void> {
    await this.db.prepare('DELETE FROM subscriptions WHERE endpoint = ?').bind(endpoint).run();
  }

  async list(): Promise<Subscription[]> {
    const { results } = await this.db
      .prepare(
        'SELECT endpoint, p256dh, auth, latitude, longitude, crops, language FROM subscriptions',
      )
      .all<Row>();
    return results.map((r) => ({
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
      latitude: r.latitude,
      longitude: r.longitude,
      crops: parseCrops(r.crops),
      language: (r.language === 'en' ? 'en' : 'pt-PT') as Language,
    }));
  }
}
