/**
 * The cup record book: courses, rounds, lifetime stats and the session-by-session
 * view of a tournament.
 *
 * Everything here is read-side apart from the course editor, and everything is
 * derived from matches that have already been played — there is no separate
 * results table to keep in step with the scores.
 */

import { db, tx, uid } from "./db";
import { STANDARD_HOLES } from "./games";
import {
  FORMAT_LABEL,
  shortName,
  type Format,
  type MatchState,
} from "./scoring";
import {
  listRounds,
  listTeams,
  loadRounds,
  teamStandings,
  type CourseRow,
  type RoundBundle,
  type RoundRow,
  type TeamStanding,
  type TeeRow,
  type TournamentRow,
} from "./tsi";

/* ---------------------------------------------------------------- courses */

export interface CourseListRow extends CourseRow {
  /** The longest tee on the course — the numbers a course is usually quoted by. */
  teeId: string | null;
  teeName: string | null;
  rating: number | null;
  slope: number | null;
  yardage: number | null;
  par: number | null;
}

/**
 * Every course with its longest set of tees. DISTINCT ON picks one tee per
 * course in a single pass rather than a query per course.
 */
export async function listCourseRows(): Promise<CourseListRow[]> {
  const rows = await db().all<CourseListRow>(
    `SELECT DISTINCT ON (c.id)
            c.id, c.name, c.city, c.state,
            t.id AS "teeId", t.name AS "teeName",
            t.rating, t.slope, t.yardage,
            (SELECT sum(par) FROM holes h WHERE h.course_id = c.id) AS par
     FROM courses c
     LEFT JOIN tees t ON t.course_id = c.id
     ORDER BY c.id, t.yardage DESC NULLS LAST, t.name`,
  );
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export interface CourseDetail {
  course: CourseRow;
  tees: TeeRow[];
  par: number | null;
  holes: number;
}

export async function getCourseDetail(id: string): Promise<CourseDetail | null> {
  const course = await db().one<CourseRow>("SELECT * FROM courses WHERE id = ?", [id]);
  if (!course) return null;
  const [tees, holes] = await Promise.all([
    db().all<TeeRow>(
      "SELECT * FROM tees WHERE course_id = ? ORDER BY yardage DESC NULLS LAST, name",
      [id],
    ),
    db().all<{ par: number }>("SELECT par FROM holes WHERE course_id = ?", [id]),
  ]);
  return {
    course,
    tees,
    par: holes.length ? holes.reduce((sum, h) => sum + h.par, 0) : null,
    holes: holes.length,
  };
}

export interface CourseInput {
  name: string;
  city: string | null;
  state: string | null;
  yardage: number | null;
  slope: number;
  rating: number;
}

/**
 * Creates a course with one set of tees and a standard 18 holes, so a course
 * added here can be played immediately — scoring needs pars and stroke indexes.
 */
export async function createCourse(input: CourseInput): Promise<string> {
  const courseId = uid("crs");
  await tx(async (q) => {
    await q.run("INSERT INTO courses (id, name, city, state) VALUES (?, ?, ?, ?)", [
      courseId,
      input.name,
      input.city,
      input.state,
    ]);
    for (const [number, par, strokeIndex] of STANDARD_HOLES) {
      await q.run(
        "INSERT INTO holes (id, course_id, number, par, stroke_index) VALUES (?, ?, ?, ?, ?)",
        [uid("hol"), courseId, number, par, strokeIndex],
      );
    }
    await q.run(
      "INSERT INTO tees (id, course_id, name, rating, slope, yardage) VALUES (?, ?, ?, ?, ?, ?)",
      [uid("tee"), courseId, "Main", input.rating, input.slope, input.yardage],
    );
  });
  return courseId;
}

/** Updates the course and its longest tee, adding a tee if it has none yet. */
export async function updateCourse(id: string, input: CourseInput): Promise<void> {
  await tx(async (q) => {
    await q.run("UPDATE courses SET name = ?, city = ?, state = ? WHERE id = ?", [
      input.name,
      input.city,
      input.state,
      id,
    ]);
    const tee = await q.one<{ id: string }>(
      "SELECT id FROM tees WHERE course_id = ? ORDER BY yardage DESC NULLS LAST, name LIMIT 1",
      [id],
    );
    if (tee) {
      await q.run("UPDATE tees SET rating = ?, slope = ?, yardage = ? WHERE id = ?", [
        input.rating,
        input.slope,
        input.yardage,
        tee.id,
      ]);
    } else {
      await q.run(
        "INSERT INTO tees (id, course_id, name, rating, slope, yardage) VALUES (?, ?, ?, ?, ?, ?)",
        [uid("tee"), id, "Main", input.rating, input.slope, input.yardage],
      );
    }
  });
}

/** Refuses while anything still points at the course, rather than cascading scores away. */
export async function deleteCourse(id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const used = await db().one<{ n: number }>(
    "SELECT count(*)::int AS n FROM rounds WHERE course_id = ?",
    [id],
  );
  if ((used?.n ?? 0) > 0) {
    return { ok: false, reason: "Rounds have been played here, so this course can't be deleted." };
  }
  await db().run("DELETE FROM courses WHERE id = ?", [id]);
  return { ok: true };
}

/* ------------------------------------------------------------ round rows */

export interface RoundListRow {
  matchId: string;
  tournamentId: string | null;
  tournamentName: string;
  /** Short label for the table: the year, or that it was a one-off game. */
  tournamentLabel: string;
  session: number;
  format: Format;
  formatLabel: string;
  courseName: string;
  playedOn: string | null;
  /** One player, or the pair that shared a ball in a foursome. */
  subject: string;
  playerIds: string[];
  gross: number;
  /** Strokes actually received: course handicap after the session's allowance. */
  handicap: number;
  net: number;
}

/**
 * One row per player (or per pair, in a foursome) per session, the way a
 * scoring sheet reads: what they went round in, what they got, what that left.
 * Subjects with nothing posted are left out.
 */
export async function listRoundRows(): Promise<RoundListRow[]> {
  const rounds = await db().all<
    RoundRow & {
      courseName: string;
      tournamentName: string | null;
      tournamentYear: number | null;
    }
  >(
    `SELECT r.*, c.name AS "courseName", t.name AS "tournamentName",
            t.year AS "tournamentYear"
     FROM rounds r
     JOIN courses c ON c.id = r.course_id
     LEFT JOIN tournaments t ON t.id = r.tournament_id
     ORDER BY r.played_on DESC NULLS LAST, r.sequence`,
  );
  if (rounds.length === 0) return [];

  const bundles = await loadRounds(rounds.map((r) => r.id));

  const rows: RoundListRow[] = [];
  for (const round of rounds) {
    const bundle = bundles.get(round.id);
    if (!bundle) continue;
    for (const match of bundle.matches) {
      for (const side of match.sides) {
        const perPlayer = match.format !== "foursome";
        const subjects = perPlayer
          ? side.players.map((p) => ({
              key: `player:${p.id}`,
              label: p.displayName,
              players: [p],
            }))
          : [
              {
                key: `side:${side.id}`,
                label: side.players.map((p) => shortName(p.displayName)).join(" / "),
                players: side.players,
              },
            ];

        for (const subject of subjects) {
          const [type, id] = subject.key.split(":");
          const posted = match.scores.filter(
            (s) => s.subjectType === type && s.subjectId === id && s.gross != null,
          );
          if (posted.length === 0) continue;
          const gross = posted.reduce((sum, s) => sum + (s.gross ?? 0), 0);
          // Strokes as they were actually given: a foursome pair plays off half
          // their combined handicap, a fourball off 90% of each.
          const handicap = Math.round(
            subject.players.reduce((sum, p) => sum + p.courseHandicap, 0) *
              bundle.round.allowance,
          );
          rows.push({
            matchId: match.id,
            tournamentId: round.tournament_id,
            tournamentName: round.tournamentName ?? "Casual game",
            tournamentLabel: round.tournamentYear
              ? String(round.tournamentYear)
              : "Game",
            session: round.sequence,
            format: match.format,
            formatLabel: FORMAT_LABEL[match.format],
            courseName: round.courseName,
            playedOn: round.played_on,
            subject: subject.label,
            playerIds: subject.players.map((p) => p.id),
            gross,
            handicap,
            net: gross - handicap,
          });
        }
      }
    }
  }
  return rows;
}

/* ------------------------------------------------------------ user stats */

export interface PlayerStatRow {
  playerId: string;
  username: string;
  displayName: string;
  photo: string | null;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  winPercent: number | null;
  /** Holes played in a birdie or better. */
  birdies: number;
}

const emptyStat = (p: {
  playerId: string;
  username: string;
  displayName: string;
  photo: string | null;
}): PlayerStatRow => ({
  ...p,
  matches: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  points: 0,
  winPercent: null,
  birdies: 0,
});

/**
 * Every player's lifetime record, built by replaying every decided match once.
 * A halved match is half a point to each side, which is what makes the points
 * column and the win percentage disagree with a straight win count.
 *
 * Birdies are credited to whoever the score belongs to; in a foursome the pair
 * share one ball, so both partners are credited with it.
 */
export async function allPlayerStats(): Promise<PlayerStatRow[]> {
  const players = await db().all<{
    playerId: string;
    username: string;
    displayName: string;
    photo: string | null;
  }>(
    `SELECT id AS "playerId", username, display_name AS "displayName", photo
     FROM players ORDER BY lower(display_name)`,
  );
  const stats = new Map(players.map((p) => [p.playerId, emptyStat(p)]));

  const roundIds = await db().all<{ id: string }>("SELECT id FROM rounds");
  const bundles = await loadRounds(roundIds.map((r) => r.id));

  for (const bundle of bundles.values()) {
    const parByHole = new Map(bundle.holes.map((h) => [h.number, h.par]));

    for (const match of bundle.matches) {
      // Birdies count from every posted score, decided match or not.
      const playersOnSide = new Map(match.sides.map((s) => [s.id, s.players]));
      for (const score of match.scores) {
        if (score.gross == null) continue;
        const par = parByHole.get(score.hole);
        if (par == null || score.gross > par - 1) continue;
        const credited =
          score.subjectType === "player"
            ? [score.subjectId]
            : (playersOnSide.get(score.subjectId) ?? []).map((p) => p.id);
        for (const playerId of credited) {
          const stat = stats.get(playerId);
          if (stat) stat.birdies += 1;
        }
      }

      if (!match.state.decided) continue;
      for (const side of match.sides) {
        const halved = match.state.winner === "halved";
        const won = match.state.winner === side.id;
        for (const player of side.players) {
          const stat = stats.get(player.id);
          if (!stat) continue;
          stat.matches += 1;
          if (halved) {
            stat.ties += 1;
            stat.points += 0.5;
          } else if (won) {
            stat.wins += 1;
            stat.points += 1;
          } else {
            stat.losses += 1;
          }
        }
      }
    }
  }

  return [...stats.values()]
    .map((stat) => ({
      ...stat,
      winPercent: stat.matches > 0 ? (stat.points / stat.matches) * 100 : null,
    }))
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
}

/* -------------------------------------------------------- cup leaderboard */

export interface CupSide {
  sideId: string;
  teamId: string | null;
  label: string;
  players: { playerId: string; displayName: string }[];
}

export interface CupMatchRow {
  matchId: string;
  name: string;
  home: CupSide | null;
  away: CupSide | null;
  /** "4 & 3", "1 up", "Halved", or the live state while it is still out there. */
  result: string;
  /** Which way the match went, for the arrow between the two sides. */
  winner: "home" | "away" | "halved" | null;
  decided: boolean;
  thru: number;
}

export interface CupSession {
  round: RoundRow;
  courseName: string;
  formatLabel: string;
  matches: CupMatchRow[];
  /** The most recent score posted in the session. */
  lastUpdated: string | null;
}

/**
 * The margin a decided match finished by, worked out from the running score
 * rather than from the engine's status line: the first hole where the lead is
 * bigger than the holes left is where it closed.
 */
function marginOf(state: MatchState, holeCount: number): string {
  if (state.winner === "halved") return "Halved";
  for (let i = 0; i < state.results.length; i += 1) {
    const remaining = holeCount - (i + 1);
    const lead = Math.abs(state.results[i].running);
    if (lead > remaining) {
      if (remaining > 0) return `${lead} & ${remaining}`;
      return lead === 1 ? "1 up" : `${lead} up`;
    }
  }
  const lead = Math.abs(state.differential);
  return lead === 1 ? "1 up" : `${lead} up`;
}

function liveLine(state: MatchState): string {
  if (state.thru === 0) return "Not started";
  if (state.differential === 0) return `All square thru ${state.thru}`;
  return `${Math.abs(state.differential)} up thru ${state.thru}`;
}

function toCupSide(side: RoundBundle["matches"][number]["sides"][number]): CupSide {
  return {
    sideId: side.id,
    teamId: side.teamId ?? null,
    label: side.players.length
      ? side.players.map((p) => shortName(p.displayName)).join(" / ")
      : side.label,
    players: side.players.map((p) => ({
      playerId: p.id,
      displayName: p.displayName,
    })),
  };
}

/**
 * Every session of a tournament with its matches laid out home team on the
 * left, away team on the right, so the sessions read the same way down the page
 * however the sides happen to be stored.
 */
export async function tournamentSessions(
  tournament: TournamentRow,
): Promise<CupSession[]> {
  const [rounds, teams] = await Promise.all([
    listRounds(tournament.id),
    listTeams(tournament.id),
  ]);
  const bundles = await loadRounds(rounds.map((r) => r.id));
  const courseNames = new Map<string, string>();
  for (const row of await db().all<{ id: string; name: string }>(
    "SELECT id, name FROM courses",
  )) {
    courseNames.set(row.id, row.name);
  }
  const homeTeamId = teams[0]?.id ?? null;

  const lastUpdates = new Map<string, string>();
  for (const row of await db().all<{ roundId: string; at: string }>(
    `SELECT m.round_id AS "roundId", max(s.updated_at)::text AS at
     FROM scores s JOIN matches m ON m.id = s.match_id
     WHERE m.round_id = ANY(?) GROUP BY m.round_id`,
    [rounds.map((r) => r.id)],
  )) {
    lastUpdates.set(row.roundId, row.at);
  }

  const sessions: CupSession[] = [];
  for (const round of rounds) {
    const bundle = bundles.get(round.id);
    if (!bundle) continue;
    const holeCount = bundle.holes.length || 18;

    const matches: CupMatchRow[] = bundle.matches.map((match) => {
      const sides = match.sides.map(toCupSide);
      // Home is the first team's side; without teams, the first side listed.
      let home = sides.find((s) => s.teamId && s.teamId === homeTeamId) ?? null;
      let away = sides.find((s) => s !== home) ?? null;
      if (!home) {
        home = sides[0] ?? null;
        away = sides[1] ?? null;
      }
      const state = match.state;
      const winner = !state.decided
        ? null
        : state.winner === "halved"
          ? ("halved" as const)
          : state.winner === home?.sideId
            ? ("home" as const)
            : ("away" as const);
      return {
        matchId: match.id,
        name: match.name,
        home,
        away,
        result: state.decided ? marginOf(state, holeCount) : liveLine(state),
        winner,
        decided: state.decided,
        thru: state.thru,
      };
    });

    sessions.push({
      round,
      courseName: courseNames.get(round.course_id) ?? "—",
      formatLabel: FORMAT_LABEL[round.format],
      matches,
      lastUpdated: lastUpdates.get(round.id) ?? null,
    });
  }
  return sessions;
}

/** Points on offer and what it takes to win the cup outright. */
export function pointsToWin(sessions: CupSession[]): {
  available: number;
  played: number;
  needed: number;
} {
  const available = sessions.reduce((sum, s) => sum + s.matches.length, 0);
  const played = sessions.reduce(
    (sum, s) => sum + s.matches.filter((m) => m.decided).length,
    0,
  );
  return { available, played, needed: Math.floor(available / 2) + 1 };
}

export interface CupRecord {
  wins: number;
  losses: number;
  ties: number;
  points: number;
}

/**
 * What each player took out of one cup. Pure, so it works off sessions already
 * loaded for the page rather than going back to the database.
 */
export function cupRecords(sessions: CupSession[]): Map<string, CupRecord> {
  const records = new Map<string, CupRecord>();
  const bump = (playerId: string, outcome: "win" | "loss" | "tie") => {
    const record = records.get(playerId) ?? { wins: 0, losses: 0, ties: 0, points: 0 };
    if (outcome === "win") {
      record.wins += 1;
      record.points += 1;
    } else if (outcome === "tie") {
      record.ties += 1;
      record.points += 0.5;
    } else {
      record.losses += 1;
    }
    records.set(playerId, record);
  };

  for (const session of sessions) {
    for (const match of session.matches) {
      if (!match.decided) continue;
      for (const [which, side] of [
        ["home", match.home],
        ["away", match.away],
      ] as const) {
        if (!side) continue;
        const outcome =
          match.winner === "halved" ? "tie" : match.winner === which ? "win" : "loss";
        for (const player of side.players) bump(player.playerId, outcome);
      }
    }
  }
  return records;
}

/** Validates the numbers a handicap depends on, so a typo can't skew scoring. */
export function readCourseInput(
  body: Partial<Record<keyof CourseInput, unknown>>,
): CourseInput | string {
  const name = String(body.name ?? "").trim();
  if (name.length < 2) return "Give the course a name.";

  const slope = Number(body.slope);
  if (!Number.isFinite(slope) || slope < 55 || slope > 155) {
    return "Slope has to be between 55 and 155.";
  }
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 55 || rating > 85) {
    return "Course rating has to be between 55 and 85.";
  }
  const yardageRaw = body.yardage;
  let yardage: number | null = null;
  if (yardageRaw != null && String(yardageRaw).trim() !== "") {
    const parsed = Number(yardageRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9000) {
      return "Yardage doesn't look right.";
    }
    yardage = Math.round(parsed);
  }

  const text = (value: unknown) => {
    const trimmed = String(value ?? "").trim();
    return trimmed === "" ? null : trimmed;
  };

  return {
    name,
    city: text(body.city),
    state: text(body.state),
    yardage,
    slope: Math.round(slope),
    rating,
  };
}

/**
 * Team standings in the tournament's own team order rather than by score.
 * The scoreboard and the session tables have to agree on which team is on the
 * left, and a score-sorted order would swap them the moment the lead changed.
 */
export async function cupStandings(tournamentId: string): Promise<TeamStanding[]> {
  const [teams, standings] = await Promise.all([
    listTeams(tournamentId),
    teamStandings(tournamentId),
  ]);
  const byId = new Map(standings.map((s) => [s.teamId, s]));
  return teams
    .map((team) => byId.get(team.id))
    .filter((s): s is TeamStanding => Boolean(s));
}
