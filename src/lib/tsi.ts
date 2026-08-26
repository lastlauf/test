/**
 * Data access + view models. Everything the UI renders is assembled here so
 * pages and API routes share one definition of a leaderboard, a match, or a
 * player's record.
 */

import { db } from "./db";
import {
  DEFAULT_ALLOWANCE,
  type Format,
  type Hole,
  type MatchState,
  type ScoreRow,
  type Side,
  courseHandicap,
  matchState,
  playerTotals,
  type PlayerTotals,
} from "./scoring";
import { computeLedger, type Ledger, type WagerDef } from "./wagers";

export interface CourseRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}
export interface TeeRow {
  id: string;
  course_id: string;
  name: string;
  rating: number;
  slope: number;
  yardage: number | null;
}
export interface TournamentRow {
  id: string;
  year: number;
  name: string;
  course_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  champion: string | null;
  notes: string | null;
}
export interface RoundRow {
  id: string;
  tournament_id: string;
  name: string;
  format: Format;
  course_id: string;
  tee_id: string | null;
  played_on: string | null;
  sequence: number;
  allowance: number;
  status: string;
}
export interface TeamRow {
  id: string;
  tournament_id: string;
  name: string;
  color: string;
}

export function listCourses(): CourseRow[] {
  return db().prepare("SELECT * FROM courses ORDER BY name").all() as CourseRow[];
}

export function getCourse(id: string): CourseRow | null {
  return (db().prepare("SELECT * FROM courses WHERE id = ?").get(id) as CourseRow) ?? null;
}

export function listTees(courseId: string): TeeRow[] {
  return db()
    .prepare("SELECT * FROM tees WHERE course_id = ? ORDER BY yardage DESC")
    .all(courseId) as TeeRow[];
}

export function getTee(id: string | null): TeeRow | null {
  if (!id) return null;
  return (db().prepare("SELECT * FROM tees WHERE id = ?").get(id) as TeeRow) ?? null;
}

export function getHoles(courseId: string): Hole[] {
  const rows = db()
    .prepare(
      "SELECT number, par, stroke_index AS strokeIndex, yardage FROM holes WHERE course_id = ? ORDER BY number",
    )
    .all(courseId) as Hole[];
  return rows;
}

export function coursePar(courseId: string): number {
  return getHoles(courseId).reduce((sum, h) => sum + h.par, 0);
}

export function listTournaments(): TournamentRow[] {
  return db()
    .prepare("SELECT * FROM tournaments ORDER BY year DESC")
    .all() as TournamentRow[];
}

export function getTournament(id: string): TournamentRow | null {
  return (
    (db().prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as TournamentRow) ??
    null
  );
}

export function activeTournament(): TournamentRow | null {
  const active = db()
    .prepare(
      "SELECT * FROM tournaments WHERE status = 'active' ORDER BY year DESC LIMIT 1",
    )
    .get() as TournamentRow | undefined;
  if (active) return active;
  return (
    (db().prepare("SELECT * FROM tournaments ORDER BY year DESC LIMIT 1").get() as
      | TournamentRow
      | undefined) ?? null
  );
}

export function listTeams(tournamentId: string): TeamRow[] {
  return db()
    .prepare("SELECT * FROM teams WHERE tournament_id = ? ORDER BY name")
    .all(tournamentId) as TeamRow[];
}

export interface EntryView {
  playerId: string;
  username: string;
  displayName: string;
  handicapIndex: number;
  photo: string | null;
  teamId: string | null;
  teamName: string | null;
  teamColor: string | null;
  courseHandicapOverride: number | null;
}

export function listEntries(tournamentId: string): EntryView[] {
  return db()
    .prepare(
      `SELECT p.id AS playerId, p.username, p.display_name AS displayName,
              p.handicap_index AS handicapIndex, p.photo,
              e.team_id AS teamId, t.name AS teamName, t.color AS teamColor,
              e.course_handicap AS courseHandicapOverride
       FROM entries e
       JOIN players p ON p.id = e.player_id
       LEFT JOIN teams t ON t.id = e.team_id
       WHERE e.tournament_id = ?
       ORDER BY p.display_name COLLATE NOCASE`,
    )
    .all(tournamentId) as EntryView[];
}

export function listRounds(tournamentId: string): RoundRow[] {
  return db()
    .prepare("SELECT * FROM rounds WHERE tournament_id = ? ORDER BY sequence, played_on")
    .all(tournamentId) as RoundRow[];
}

export function getRound(id: string): RoundRow | null {
  return (db().prepare("SELECT * FROM rounds WHERE id = ?").get(id) as RoundRow) ?? null;
}

/** Course handicap for a player on a given round's tee, honouring overrides. */
export function playerCourseHandicap(round: RoundRow, entry: EntryView): number {
  if (entry.courseHandicapOverride != null) return entry.courseHandicapOverride;
  const tee = getTee(round.tee_id);
  const par = coursePar(round.course_id);
  if (!tee) return Math.round(entry.handicapIndex);
  return courseHandicap(entry.handicapIndex, tee.slope, tee.rating, par);
}

export interface MatchView {
  id: string;
  roundId: string;
  name: string;
  sequence: number;
  status: string;
  format: Format;
  allowance: number;
  sides: Side[];
  scores: ScoreRow[];
  state: MatchState;
}

function loadSides(matchId: string, round: RoundRow, entries: EntryView[]): Side[] {
  const sideRows = db()
    .prepare(
      `SELECT ms.id, ms.label, ms.team_id AS teamId, t.name AS teamName, t.color AS teamColor
       FROM match_sides ms LEFT JOIN teams t ON t.id = ms.team_id
       WHERE ms.match_id = ? ORDER BY ms.label`,
    )
    .all(matchId) as {
    id: string;
    label: string;
    teamId: string | null;
    teamName: string | null;
    teamColor: string | null;
  }[];
  const byId = new Map(entries.map((e) => [e.playerId, e]));
  return sideRows.map((row) => {
    const players = (
      db()
        .prepare(
          `SELECT p.id, p.display_name AS displayName, p.handicap_index AS handicapIndex
           FROM side_players sp JOIN players p ON p.id = sp.player_id
           WHERE sp.side_id = ? ORDER BY p.display_name`,
        )
        .all(row.id) as { id: string; displayName: string; handicapIndex: number }[]
    ).map((p) => {
      const entry = byId.get(p.id) ?? {
        playerId: p.id,
        username: "",
        displayName: p.displayName,
        handicapIndex: p.handicapIndex,
        photo: null,
        teamId: null,
        teamName: null,
        teamColor: null,
        courseHandicapOverride: null,
      };
      return {
        id: p.id,
        displayName: p.displayName,
        courseHandicap: playerCourseHandicap(round, entry),
      };
    });
    return { ...row, players };
  });
}

export function loadScores(matchId: string): ScoreRow[] {
  return db()
    .prepare(
      `SELECT hole, subject_type AS subjectType, subject_id AS subjectId, gross, putts
       FROM scores WHERE match_id = ? ORDER BY hole`,
    )
    .all(matchId) as ScoreRow[];
}

export function getMatchView(matchId: string): MatchView | null {
  const match = db()
    .prepare("SELECT * FROM matches WHERE id = ?")
    .get(matchId) as
    | { id: string; round_id: string; name: string; sequence: number; status: string }
    | undefined;
  if (!match) return null;
  const round = getRound(match.round_id);
  if (!round) return null;
  const entries = listEntries(round.tournament_id);
  const sides = loadSides(match.id, round, entries);
  const scores = loadScores(match.id);
  const holes = getHoles(round.course_id);
  const allowance = round.allowance ?? DEFAULT_ALLOWANCE[round.format];
  return {
    id: match.id,
    roundId: round.id,
    name: match.name,
    sequence: match.sequence,
    status: match.status,
    format: round.format,
    allowance,
    sides,
    scores,
    state: matchState(holes, sides, scores, round.format, allowance),
  };
}

export function listMatchViews(roundId: string): MatchView[] {
  const ids = db()
    .prepare("SELECT id FROM matches WHERE round_id = ? ORDER BY sequence")
    .all(roundId) as { id: string }[];
  return ids
    .map((row) => getMatchView(row.id))
    .filter((view): view is MatchView => view !== null);
}

export interface LeaderboardEntry extends PlayerTotals {
  displayName: string;
  username: string;
  photo: string | null;
  teamName: string | null;
  teamColor: string | null;
  courseHandicap: number;
  matchName: string;
}

/** Individual gross/net board for one round, across every match in it. */
export function roundLeaderboard(roundId: string): LeaderboardEntry[] {
  const round = getRound(roundId);
  if (!round) return [];
  const holes = getHoles(round.course_id);
  const entries = listEntries(round.tournament_id);
  const byId = new Map(entries.map((e) => [e.playerId, e]));
  const out: LeaderboardEntry[] = [];
  for (const match of listMatchViews(roundId)) {
    for (const side of match.sides) {
      for (const player of side.players) {
        const entry = byId.get(player.id);
        // The individual net board always plays off the full course handicap;
        // format allowances (90% fourball, 50% foursomes) belong to the match.
        const totals = playerTotals(
          player.id,
          holes,
          match.scores,
          player.courseHandicap,
        );
        out.push({
          ...totals,
          displayName: player.displayName,
          username: entry?.username ?? "",
          photo: entry?.photo ?? null,
          teamName: side.teamName ?? entry?.teamName ?? null,
          teamColor: side.teamColor ?? entry?.teamColor ?? null,
          courseHandicap: player.courseHandicap,
          matchName: match.name,
        });
      }
    }
  }
  return out.sort((a, b) => {
    if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
    if (a.holesPlayed === 0) return 1;
    if (b.holesPlayed === 0) return -1;
    return a.netToPar - b.netToPar || a.toPar - b.toPar;
  });
}

export interface TeamStanding {
  teamId: string;
  name: string;
  color: string;
  points: number;
}

/** Match play points: 1 for a win, 0.5 each for a halve. */
export function teamStandings(tournamentId: string): TeamStanding[] {
  const teams = listTeams(tournamentId);
  const points = new Map(teams.map((t) => [t.id, 0]));
  for (const round of listRounds(tournamentId)) {
    for (const match of listMatchViews(round.id)) {
      if (!match.state.decided) continue;
      if (match.state.winner === "halved") {
        for (const side of match.sides) {
          if (side.teamId && points.has(side.teamId)) {
            points.set(side.teamId, points.get(side.teamId)! + 0.5);
          }
        }
      } else {
        const side = match.sides.find((s) => s.id === match.state.winner);
        if (side?.teamId && points.has(side.teamId)) {
          points.set(side.teamId, points.get(side.teamId)! + 1);
        }
      }
    }
  }
  return teams
    .map((t) => ({ teamId: t.id, name: t.name, color: t.color, points: points.get(t.id) ?? 0 }))
    .sort((a, b) => b.points - a.points);
}

export interface TournamentBoardRow {
  playerId: string;
  displayName: string;
  username: string;
  photo: string | null;
  teamName: string | null;
  teamColor: string | null;
  gross: number;
  net: number;
  toPar: number;
  netToPar: number;
  holesPlayed: number;
  rounds: number;
  points: number;
}

/** Aggregate individual board across every round of a tournament. */
export function tournamentLeaderboard(tournamentId: string): TournamentBoardRow[] {
  const map = new Map<string, TournamentBoardRow>();
  const entries = listEntries(tournamentId);
  for (const entry of entries) {
    map.set(entry.playerId, {
      playerId: entry.playerId,
      displayName: entry.displayName,
      username: entry.username,
      photo: entry.photo,
      teamName: entry.teamName,
      teamColor: entry.teamColor,
      gross: 0,
      net: 0,
      toPar: 0,
      netToPar: 0,
      holesPlayed: 0,
      rounds: 0,
      points: 0,
    });
  }
  for (const round of listRounds(tournamentId)) {
    for (const row of roundLeaderboard(round.id)) {
      const existing = map.get(row.playerId);
      if (!existing || row.holesPlayed === 0) continue;
      existing.gross += row.gross;
      existing.net += row.net;
      existing.toPar += row.toPar;
      existing.netToPar += row.netToPar;
      existing.holesPlayed += row.holesPlayed;
      existing.rounds += 1;
    }
    for (const match of listMatchViews(round.id)) {
      if (!match.state.decided) continue;
      for (const side of match.sides) {
        const won = match.state.winner === side.id;
        const halved = match.state.winner === "halved";
        if (!won && !halved) continue;
        for (const player of side.players) {
          const existing = map.get(player.id);
          if (existing) existing.points += won ? 1 : 0.5;
        }
      }
    }
  }
  return [...map.values()]
    .filter((row) => row.holesPlayed > 0 || row.points > 0)
    .sort((a, b) => a.netToPar - b.netToPar || a.toPar - b.toPar);
}

export interface FormatRecord {
  wins: number;
  losses: number;
  halves: number;
}

export interface PlayerRecord {
  overall: FormatRecord;
  byFormat: Record<Format, FormatRecord>;
  headToHead: {
    opponentId: string;
    opponentName: string;
    opponentUsername: string;
    wins: number;
    losses: number;
    halves: number;
  }[];
  partners: { playerId: string; name: string; wins: number; losses: number; halves: number }[];
  tournaments: number;
  championships: number;
}

const emptyRecord = (): FormatRecord => ({ wins: 0, losses: 0, halves: 0 });

/** Lifetime record built by replaying every decided match the player was in. */
export function playerRecord(playerId: string): PlayerRecord {
  const record: PlayerRecord = {
    overall: emptyRecord(),
    byFormat: {
      fourball: emptyRecord(),
      foursome: emptyRecord(),
      singles: emptyRecord(),
    },
    headToHead: [],
    partners: [],
    tournaments: 0,
    championships: 0,
  };
  const h2h = new Map<string, { name: string; username: string; wins: number; losses: number; halves: number }>();
  const partners = new Map<string, { name: string; wins: number; losses: number; halves: number }>();

  const matchIds = db()
    .prepare(
      `SELECT DISTINCT ms.match_id AS matchId
       FROM side_players sp JOIN match_sides ms ON ms.id = sp.side_id
       WHERE sp.player_id = ?`,
    )
    .all(playerId) as { matchId: string }[];

  for (const { matchId } of matchIds) {
    const view = getMatchView(matchId);
    if (!view || !view.state.decided) continue;
    const mySide = view.sides.find((s) => s.players.some((p) => p.id === playerId));
    const theirSide = view.sides.find((s) => s.id !== mySide?.id);
    if (!mySide) continue;
    const outcome =
      view.state.winner === "halved"
        ? "halves"
        : view.state.winner === mySide.id
          ? "wins"
          : "losses";
    record.overall[outcome] += 1;
    record.byFormat[view.format][outcome] += 1;
    for (const opponent of theirSide?.players ?? []) {
      const existing = h2h.get(opponent.id) ?? {
        name: opponent.displayName,
        username: "",
        wins: 0,
        losses: 0,
        halves: 0,
      };
      existing[outcome] += 1;
      h2h.set(opponent.id, existing);
    }
    for (const mate of mySide.players) {
      if (mate.id === playerId) continue;
      const existing = partners.get(mate.id) ?? {
        name: mate.displayName,
        wins: 0,
        losses: 0,
        halves: 0,
      };
      existing[outcome] += 1;
      partners.set(mate.id, existing);
    }
  }

  const usernames = new Map(
    (
      db().prepare("SELECT id, username FROM players").all() as {
        id: string;
        username: string;
      }[]
    ).map((row) => [row.id, row.username]),
  );

  record.headToHead = [...h2h.entries()]
    .map(([opponentId, value]) => ({
      opponentId,
      opponentName: value.name,
      opponentUsername: usernames.get(opponentId) ?? "",
      wins: value.wins,
      losses: value.losses,
      halves: value.halves,
    }))
    .sort((a, b) => b.wins + b.losses + b.halves - (a.wins + a.losses + a.halves));
  record.partners = [...partners.entries()]
    .map(([id, value]) => ({ playerId: id, ...value }))
    .sort((a, b) => b.wins - a.wins);

  record.tournaments = (
    db()
      .prepare("SELECT COUNT(*) AS n FROM entries WHERE player_id = ?")
      .get(playerId) as { n: number }
  ).n;
  record.championships = (
    db()
      .prepare(
        `SELECT COUNT(*) AS n FROM tournaments t
         JOIN entries e ON e.tournament_id = t.id AND e.player_id = ?
         LEFT JOIN teams tm ON tm.id = e.team_id
         WHERE t.champion IS NOT NULL
           AND (t.champion = tm.name OR t.champion = (SELECT display_name FROM players WHERE id = ?))`,
      )
      .get(playerId, playerId) as { n: number }
  ).n;

  return record;
}

export function winPercent(record: FormatRecord): number | null {
  const played = record.wins + record.losses + record.halves;
  if (played === 0) return null;
  return ((record.wins + record.halves * 0.5) / played) * 100;
}

export function listWagers(roundId: string): WagerDef[] {
  const rows = db()
    .prepare("SELECT * FROM wagers WHERE round_id = ? ORDER BY created_at")
    .all(roundId) as {
    id: string;
    type: WagerDef["type"];
    amount: number;
    match_id: string | null;
    settings: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    matchId: row.match_id,
    settings: JSON.parse(row.settings || "{}"),
    playerIds: (
      db()
        .prepare("SELECT player_id AS id FROM wager_players WHERE wager_id = ?")
        .all(row.id) as { id: string }[]
    ).map((p) => p.id),
  }));
}

export function roundLedger(roundId: string): Ledger & { players: Record<string, string> } {
  const round = getRound(roundId);
  if (!round) {
    return { results: [], balances: [], settlements: [], total: 0, players: {} };
  }
  const holes = getHoles(round.course_id);
  const matches = listMatchViews(round.id);
  const players: Record<string, { id: string; displayName: string; courseHandicap: number }> = {};
  for (const match of matches) {
    for (const side of match.sides) {
      for (const player of side.players) {
        players[player.id] = {
          id: player.id,
          displayName: player.displayName,
          courseHandicap: player.courseHandicap,
        };
      }
    }
  }
  const ledger = computeLedger({
    holes,
    format: round.format,
    allowance: round.allowance,
    matches: matches.map((m) => ({
      id: m.id,
      name: m.name,
      sides: m.sides,
      scores: m.scores,
    })),
    wagers: listWagers(round.id),
    players,
  });
  const names: Record<string, string> = {};
  for (const [id, player] of Object.entries(players)) names[id] = player.displayName;
  return { ...ledger, players: names };
}
