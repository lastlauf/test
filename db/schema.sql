-- Turkey Slice Invitational schema (PostgreSQL).
-- Applied by `npm run db:setup`; safe to re-run.

CREATE TABLE IF NOT EXISTS players (
  id             text PRIMARY KEY,
  username       text NOT NULL,
  display_name   text NOT NULL,
  email          text,
  password_hash  text,
  google_sub     text UNIQUE,
  ghin           text,
  handicap_index double precision NOT NULL DEFAULT 18,
  photo          text,
  member_since   integer,
  bio            text,
  is_admin       smallint NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
-- Usernames and emails are both compared case-insensitively. Accounts created
-- through Google may have no password; accounts created with an email have one.
CREATE UNIQUE INDEX IF NOT EXISTS players_username_key ON players (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS players_email_key ON players (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  token      text PRIMARY KEY,
  player_id  text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id    text PRIMARY KEY,
  name  text NOT NULL,
  city  text,
  state text
);

CREATE TABLE IF NOT EXISTS tees (
  id        text PRIMARY KEY,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name      text NOT NULL,
  rating    double precision NOT NULL,
  slope     integer NOT NULL,
  yardage   integer
);

CREATE TABLE IF NOT EXISTS holes (
  id           text PRIMARY KEY,
  course_id    text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  number       integer NOT NULL,
  par          integer NOT NULL,
  stroke_index integer NOT NULL,
  yardage      integer,
  UNIQUE (course_id, number)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id         text PRIMARY KEY,
  year       integer NOT NULL,
  name       text NOT NULL,
  course_id  text REFERENCES courses(id),
  start_date text,
  end_date   text,
  status     text NOT NULL DEFAULT 'upcoming',
  champion   text,
  notes      text
);

CREATE TABLE IF NOT EXISTS teams (
  id            text PRIMARY KEY,
  tournament_id text NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          text NOT NULL,
  color         text NOT NULL DEFAULT '#1d4ed8'
);

CREATE TABLE IF NOT EXISTS entries (
  tournament_id   text NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id       text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id         text REFERENCES teams(id) ON DELETE SET NULL,
  course_handicap integer,
  PRIMARY KEY (tournament_id, player_id)
);

-- A round belongs to a tournament, or stands alone as a game someone started
-- from the app: tournament_id is null and created_by names the starter.
CREATE TABLE IF NOT EXISTS rounds (
  id            text PRIMARY KEY,
  tournament_id text REFERENCES tournaments(id) ON DELETE CASCADE,
  name          text NOT NULL,
  format        text NOT NULL,             -- fourball | foursome | singles
  course_id     text NOT NULL REFERENCES courses(id),
  tee_id        text REFERENCES tees(id),
  played_on     text,
  sequence      integer NOT NULL DEFAULT 1,
  allowance     double precision NOT NULL DEFAULT 1,
  status        text NOT NULL DEFAULT 'upcoming',  -- open | live | complete | archived
  created_by    text REFERENCES players(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id       text PRIMARY KEY,
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  name     text NOT NULL,
  sequence integer NOT NULL DEFAULT 1,
  status   text NOT NULL DEFAULT 'upcoming'
);

CREATE TABLE IF NOT EXISTS match_sides (
  id       text PRIMARY KEY,
  match_id text NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  label    text NOT NULL,
  team_id  text REFERENCES teams(id) ON DELETE SET NULL,
  UNIQUE (match_id, label)
);

CREATE TABLE IF NOT EXISTS side_players (
  side_id   text NOT NULL REFERENCES match_sides(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (side_id, player_id)
);

-- One row per scoring subject per hole. subject_type is 'player' for
-- fourball/singles and 'side' for foursome, where the pair plays one ball.
CREATE TABLE IF NOT EXISTS scores (
  id           text PRIMARY KEY,
  match_id     text NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  hole         integer NOT NULL,
  subject_type text NOT NULL,
  subject_id   text NOT NULL,
  gross        integer,
  putts        integer,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text REFERENCES players(id),
  UNIQUE (match_id, hole, subject_type, subject_id)
);

CREATE TABLE IF NOT EXISTS wagers (
  id         text PRIMARY KEY,
  round_id   text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  match_id   text REFERENCES matches(id) ON DELETE CASCADE,
  type       text NOT NULL,               -- nassau | skins | h2h
  amount     double precision NOT NULL,
  settings   text NOT NULL DEFAULT '{}',  -- JSON
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wager_players (
  wager_id  text NOT NULL REFERENCES wagers(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (wager_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_match ON scores(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round_id);
CREATE INDEX IF NOT EXISTS idx_rounds_tournament ON rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_side_players_player ON side_players(player_id);

-- Migrations for databases created before games existed.
ALTER TABLE rounds ALTER COLUMN tournament_id DROP NOT NULL;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS created_by text REFERENCES players(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_rounds_created_by ON rounds(created_by);
