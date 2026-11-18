-- Sea agitation alerts (RF-21, D-37). One row per phone, as before, now for either kind of
-- alert or both:
--   frost: the location rounded to 0.01° and the crops, only while frost alerts are on
--          (latitude and longitude are NULL otherwise);
--   sea:   the IPMA warning area of the chosen port (the coastal district, e.g. 'AVR'), only
--          while sea alerts are on, and whether yellow warnings count too.
-- SQLite cannot drop NOT NULL in place, hence the copy. Existing rows are frost alerts.
CREATE TABLE subscriptions_new (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  latitude   REAL,
  longitude  REAL,
  crops      TEXT NOT NULL DEFAULT '[]',
  language   TEXT NOT NULL,
  sea_area   TEXT,
  sea_yellow INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CHECK (latitude IS NOT NULL OR sea_area IS NOT NULL)
);

INSERT INTO subscriptions_new
  (endpoint, p256dh, auth, latitude, longitude, crops, language, created_at, updated_at)
SELECT endpoint, p256dh, auth, latitude, longitude, crops, language, created_at, updated_at
FROM subscriptions;

DROP TABLE subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;

-- The sea agitation warnings already seen, so each one is notified once. Times are IPMA's
-- local times without a zone. Nothing about subscribers here.
CREATE TABLE sea_warnings_seen (
  area     TEXT NOT NULL,
  level    TEXT NOT NULL,
  start    TEXT NOT NULL,
  end_time TEXT NOT NULL,
  PRIMARY KEY (area, level, start)
);
