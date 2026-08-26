import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS players (
  id             TEXT PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name   TEXT NOT NULL,
  email          TEXT,
  password_hash  TEXT,
  google_sub     TEXT UNIQUE,
  ghin           TEXT,
  handicap_index REAL NOT NULL DEFAULT 18,
  photo          TEXT,
  member_since   INTEGER,
  bio            TEXT,
  is_admin       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  city  TEXT,
  state TEXT
);

CREATE TABLE IF NOT EXISTS tees (
  id        TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  rating    REAL NOT NULL,
  slope     INTEGER NOT NULL,
  yardage   INTEGER
);

CREATE TABLE IF NOT EXISTS holes (
  id           TEXT PRIMARY KEY,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  number       INTEGER NOT NULL,
  par          INTEGER NOT NULL,
  stroke_index INTEGER NOT NULL,
  yardage      INTEGER,
  UNIQUE (course_id, number)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id         TEXT PRIMARY KEY,
  year       INTEGER NOT NULL,
  name       TEXT NOT NULL,
  course_id  TEXT REFERENCES courses(id),
  start_date TEXT,
  end_date   TEXT,
  status     TEXT NOT NULL DEFAULT 'upcoming',
  champion   TEXT,
  notes      TEXT
);

CREATE TABLE IF NOT EXISTS teams (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#1d4ed8'
);

CREATE TABLE IF NOT EXISTS entries (
  tournament_id   TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id       TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id         TEXT REFERENCES teams(id) ON DELETE SET NULL,
  course_handicap INTEGER,
  PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS rounds (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  format        TEXT NOT NULL,            -- fourball | foursome | singles
  course_id     TEXT NOT NULL REFERENCES courses(id),
  tee_id        TEXT REFERENCES tees(id),
  played_on     TEXT,
  sequence      INTEGER NOT NULL DEFAULT 1,
  allowance     REAL NOT NULL DEFAULT 1,  -- handicap allowance, e.g. 0.9 for fourball
  status        TEXT NOT NULL DEFAULT 'upcoming'
);

CREATE TABLE IF NOT EXISTS matches (
  id       TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  status   TEXT NOT NULL DEFAULT 'upcoming'
);

CREATE TABLE IF NOT EXISTS match_sides (
  id       TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,                 -- 'A' | 'B'
  team_id  TEXT REFERENCES teams(id) ON DELETE SET NULL,
  UNIQUE (match_id, label)
);

CREATE TABLE IF NOT EXISTS side_players (
  side_id   TEXT NOT NULL REFERENCES match_sides(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (side_id, player_id)
);

-- One row per scoring subject per hole. subject_type is 'player' for
-- fourball/singles and 'side' for foursome (alternate shot).
CREATE TABLE IF NOT EXISTS scores (
  id           TEXT PRIMARY KEY,
  match_id     TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  hole         INTEGER NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id   TEXT NOT NULL,
  gross        INTEGER,
  putts        INTEGER,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by   TEXT REFERENCES players(id),
  UNIQUE (match_id, hole, subject_type, subject_id)
);

CREATE TABLE IF NOT EXISTS wagers (
  id         TEXT PRIMARY KEY,
  round_id   TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  match_id   TEXT REFERENCES matches(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,               -- nassau | skins | h2h
  amount     REAL NOT NULL,
  settings   TEXT NOT NULL DEFAULT '{}',  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wager_players (
  wager_id  TEXT NOT NULL REFERENCES wagers(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (wager_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_match ON scores(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round_id);
CREATE INDEX IF NOT EXISTS idx_rounds_tournament ON rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id);
`;

let instance: Database.Database | null = null;

export function db(): Database.Database {
  if (instance) return instance;
  const file =
    process.env.TSI_DB_PATH ?? path.join(process.cwd(), "data", "tsi.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const conn = new Database(file);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.exec(SCHEMA);
  instance = conn;
  return conn;
}

export function uid(prefix = ""): string {
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return prefix ? `${prefix}_${raw}` : raw;
}
