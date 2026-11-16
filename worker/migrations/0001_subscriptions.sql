-- Frost alert subscriptions (RF-14, RF-17, D-33). No name, no account (RNF-03): the push
-- subscription, a location rounded to 0.01° (~1 km), the frost-sensitive crops growing in
-- the garden (display names, in the subscriber's language) and that language.
-- A row is deleted when the user turns the alerts off or the push service drops it.
CREATE TABLE subscriptions (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  latitude   REAL NOT NULL,
  longitude  REAL NOT NULL,
  crops      TEXT NOT NULL DEFAULT '[]',
  language   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
