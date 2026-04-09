-- Home Postal System: Initial Schema

CREATE TABLE IF NOT EXISTS mail (
  id TEXT PRIMARY KEY,
  recipient_name TEXT NOT NULL,
  room TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('A', 'B')),
  drop_station TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting', 'eligible', 'delivered')),
  sort_zone TEXT NOT NULL CHECK(sort_zone IN ('upstairs', 'downstairs')),
  priority_number INTEGER,
  stamped INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  eligible_at TEXT,
  delivered_at TEXT,
  delivery_round INTEGER
);

CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK(zone IN ('upstairs', 'downstairs', 'hub')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS delivery_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  mail_count INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS delivery_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mail_id TEXT NOT NULL,
  round_id INTEGER,
  action TEXT NOT NULL,
  actor TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (mail_id) REFERENCES mail(id),
  FOREIGN KEY (round_id) REFERENCES delivery_rounds(id)
);

-- Seed default stations
INSERT OR IGNORE INTO stations (id, name, zone, description) VALUES
  ('office', 'Main Office', 'hub', 'Central mail hub — all mail originates or routes through here'),
  ('station-1', 'Hallway Station', 'downstairs', 'Downstairs hallway drop point near the front door'),
  ('station-2', 'Kitchen Station', 'downstairs', 'Kitchen counter drop point'),
  ('station-3', 'Landing Station', 'upstairs', 'Top of stairs landing drop point'),
  ('station-4', 'Study Station', 'upstairs', 'Study room corner drop point');
