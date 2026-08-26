/**
 * Data access + view models. Everything the UI renders is assembled here so
 * pages and API routes share one definition of a leaderboard, a match, or a
 * player's record.
 *
 * Rounds are loaded in bundles: one fixed set of queries fetches every match,
 * side, player and score for any number of rounds, so a leaderboard costs the
 * same handful of round trips whether it covers one round or a decade of them.
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
  /** Null for a game someone started from the app rather than a scheduled round. */
  tournament_id: string | null;
  name: string;
  format: Format;
  course_id: string;
  tee_id: string | null;
  played_on: string | null;
  sequence: number;
  allowance: number;
  status: string;
  /** Set when a player started this round as a game from the app. */
  created_by: string | null;
}

export interface TeamRow {
  id: string;
  tournament_id: string;
  name: string;
  color: string;
}

export function listCourses(): Promise<CourseRow[]> {
  return db().all<CourseRow>("SELECT * FROM courses ORDER BY name");
}

export function getCourse(id: string): Promise<CourseRow | null> {
  return db().one<CourseRow>("SELECT * FROM courses WHERE id = ?", [id]);
}

export function listTees(courseId: string): Promise<TeeRow[]> {
  return db().all<TeeRow>(
    "SELECT * FROM tees WHERE course_id = ? ORDER BY yardage DESC NULLS LAST",
    [courseId],
  );
}

export async function getTee(id: string | null): Promise<TeeRow | null> {
  if (!id) return null;
  return db().one<TeeRow>("SELECT * FROM tees WHERE id = ?", [id]);
}

export function getHoles(courseId: string): Promise<Hole[]> {
  return db().all<Hole>(
    `SELECT number, par, stroke_index AS "strokeIndex", yardage
     FROM holes WHERE course_id = ? ORDER BY number`,
    [courseId],
  );
}

export async function coursePar(courseId: string): Promise<number> {
  const holes = await getHoles(courseId);
  return holes.reduce((sum, h) => sum + h.par, 0);
}

export function listTournaments(): Promise<TournamentRow[]> {
  return db().all<TournamentRow>("SELECT * FROM tournaments ORDER BY year DESC");
}

export function getTournament(id: string): Promise<TournamentRow | null> {
  return db().one<TournamentRow>("SELECT * FROM tournaments WHERE id = ?", [id]);
}

export function getTournamentByYear(year: number): Promise<TournamentRow | null> {
  return db().one<TournamentRow>("SELECT * FROM tournaments WHERE year = ?", [year]);
}

export async function activeTournament(): Promise<TournamentRow | null> {
  const active = await db().one<TournamentRow>(
    "SELECT * FROM tournaments WHERE status = 'active' ORDER BY year DESC LIMIT 1",
  );
  if (active) return active;
  return db().one<TournamentRow>("SELECT * FROM tournaments ORDER BY year DESC LIMIT 1");
}

export function listTeams(tournamentId: string): Promise<TeamRow[]> {
  return db().all<TeamRow>(
    "SELECT * FROM teams WHERE tournament_id = ? ORDER BY name",
    [tournamentId],
  );
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

const ENTRY_SELECT = `
  SELECT e.tournament_id AS "tournamentId", p.id AS "playerId", p.username,
         p.display_name AS "displayName", p.handicap_index AS "handicapIndex",
         p.photo, e.team_id AS "teamId", t.name AS "teamName",
         t.color AS "teamColor", e.course_handicap AS "courseHandicapOverride"
  FROM entries e
  JOIN players p ON p.id = e.player_id
  LEFT JOIN teams t ON t.id = e.team_id`;

export async function listEntries(tournamentId: string): Promise<EntryView[]> {
  return db().all<EntryView>(
    `${ENTRY_SELECT} WHERE e.tournament_id = ? ORDER BY lower(p.display_name)`,
    [tournamentId],
  );
}

export function listRounds(tournamentId: string): Promise<RoundRow[]> {
  return db().all<RoundRow>(
    "SELECT * FROM rounds WHERE tournament_id = ? ORDER BY sequence, played_on",
    [tournamentId],
  );
}

export function getRound(id: string): Promise<RoundRow | null> {
  return db().one<RoundRow>("SELECT * FROM rounds WHERE id = ?", [id]);
}

/** Course handicap for a player on a given tee, honouring per-entry overrides. */
function computeCourseHandicap(
  entry: Pick<EntryView, "handicapIndex" | "courseHandicapOverride">,
  tee: TeeRow | null,
  par: number,
): number {
  if (entry.courseHandicapOverride != null) return entry.courseHandicapOverride;
  if (!tee) return Math.round(entry.handicapIndex);
  return courseHandicap(entry.handicapIndex, tee.slope, tee.rating, par);
}

export async function playerCourseHandicap(
  round: RoundRow,
  entry: EntryView,
): Promise<number> {
  const [tee, par] = await Promise.all([
    getTee(round.tee_id),
    coursePar(round.course_id),
  ]);
  return computeCourseHandicap(entry, tee, par);
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

export interface RoundBundle {
  round: RoundRow;
  holes: Hole[];
  tee: TeeRow | null;
  entries: EntryView[];
  matches: MatchView[];
}

/**
 * Loads every round in `roundIds` with its matches, sides, players and scores
 * using a fixed number of queries.
 */
export async function loadRounds(
  roundIds: string[],
): Promise<Map<string, RoundBundle>> {
  const bundles = new Map<string, RoundBundle>();
  if (roundIds.length === 0) return bundles;

  const rounds = await db().all<RoundRow>(
    "SELECT * FROM rounds WHERE id = ANY(?) ORDER BY sequence, played_on",
    [roundIds],
  );
  if (rounds.length === 0) return bundles;

  const courseIds = [...new Set(rounds.map((r) => r.course_id))];
  const teeIds = [...new Set(rounds.map((r) => r.tee_id).filter(Boolean))] as string[];
  const tournamentIds = [...new Set(rounds.map((r) => r.tournament_id))].filter(
    (id): id is string => Boolean(id),
  );
  const ids = rounds.map((r) => r.id);

  const [holeRows, teeRows, entryRows, matchRows] = await Promise.all([
    db().all<Hole & { course_id: string }>(
      `SELECT course_id, number, par, stroke_index AS "strokeIndex", yardage
       FROM holes WHERE course_id = ANY(?) ORDER BY number`,
      [courseIds],
    ),
    teeIds.length
      ? db().all<TeeRow>("SELECT * FROM tees WHERE id = ANY(?)", [teeIds])
      : Promise.resolve([] as TeeRow[]),
    tournamentIds.length
      ? db().all<EntryView & { tournamentId: string }>(
          `${ENTRY_SELECT} WHERE e.tournament_id = ANY(?) ORDER BY lower(p.display_name)`,
          [tournamentIds],
        )
      : Promise.resolve([] as (EntryView & { tournamentId: string })[]),
    db().all<{
      id: string;
      round_id: string;
      name: string;
      sequence: number;
      status: string;
    }>(
      "SELECT * FROM matches WHERE round_id = ANY(?) ORDER BY sequence",
      [ids],
    ),
  ]);

  const matchIds = matchRows.map((m) => m.id);
  const [sideRows, scoreRows] = await Promise.all([
    matchIds.length
      ? db().all<{
          id: string;
          match_id: string;
          label: string;
          teamId: string | null;
          teamName: string | null;
          teamColor: string | null;
        }>(
          `SELECT ms.id, ms.match_id, ms.label, ms.team_id AS "teamId",
                  t.name AS "teamName", t.color AS "teamColor"
           FROM match_sides ms LEFT JOIN teams t ON t.id = ms.team_id
           WHERE ms.match_id = ANY(?) ORDER BY ms.label`,
          [matchIds],
        )
      : Promise.resolve([]),
    matchIds.length
      ? db().all<ScoreRow & { match_id: string }>(
          `SELECT match_id, hole, subject_type AS "subjectType",
                  subject_id AS "subjectId", gross, putts
           FROM scores WHERE match_id = ANY(?) ORDER BY hole`,
          [matchIds],
        )
      : Promise.resolve([]),
  ]);

  const sideIds = sideRows.map((s) => s.id);
  const sidePlayerRows = sideIds.length
    ? await db().all<{
        side_id: string;
        id: string;
        displayName: string;
        handicapIndex: number;
      }>(
        `SELECT sp.side_id, p.id, p.display_name AS "displayName",
                p.handicap_index AS "handicapIndex"
         FROM side_players sp JOIN players p ON p.id = sp.player_id
         WHERE sp.side_id = ANY(?) ORDER BY lower(p.display_name)`,
        [sideIds],
      )
    : [];

  const holesByCourse = new Map<string, Hole[]>();
  for (const row of holeRows) {
    const list = holesByCourse.get(row.course_id) ?? [];
    list.push({
      number: row.number,
      par: row.par,
      strokeIndex: row.strokeIndex,
      yardage: row.yardage,
    });
    holesByCourse.set(row.course_id, list);
  }
  const teesById = new Map(teeRows.map((t) => [t.id, t]));
  const entriesByTournament = new Map<string, EntryView[]>();
  for (const row of entryRows) {
    const list = entriesByTournament.get(row.tournamentId) ?? [];
    list.push(row);
    entriesByTournament.set(row.tournamentId, list);
  }
  const sidesByMatch = new Map<string, typeof sideRows>();
  for (const row of sideRows) {
    const list = sidesByMatch.get(row.match_id) ?? [];
    list.push(row);
    sidesByMatch.set(row.match_id, list);
  }
  const playersBySide = new Map<string, typeof sidePlayerRows>();
  for (const row of sidePlayerRows) {
    const list = playersBySide.get(row.side_id) ?? [];
    list.push(row);
    playersBySide.set(row.side_id, list);
  }
  const scoresByMatch = new Map<string, ScoreRow[]>();
  for (const row of scoreRows) {
    const list = scoresByMatch.get(row.match_id) ?? [];
    list.push({
      hole: row.hole,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      gross: row.gross,
      putts: row.putts,
    });
    scoresByMatch.set(row.match_id, list);
  }

  for (const round of rounds) {
    const holes = holesByCourse.get(round.course_id) ?? [];
    const par = holes.reduce((sum, h) => sum + h.par, 0);
    const tee = round.tee_id ? (teesById.get(round.tee_id) ?? null) : null;
    const entries = round.tournament_id
      ? (entriesByTournament.get(round.tournament_id) ?? [])
      : [];
    const entryById = new Map(entries.map((e) => [e.playerId, e]));
    const allowance = round.allowance ?? DEFAULT_ALLOWANCE[round.format];

    const matches: MatchView[] = matchRows
      .filter((m) => m.round_id === round.id)
      .map((match) => {
        const sides: Side[] = (sidesByMatch.get(match.id) ?? []).map((side) => ({
          id: side.id,
          label: side.label,
          teamId: side.teamId,
          teamName: side.teamName,
          teamColor: side.teamColor,
          players: (playersBySide.get(side.id) ?? []).map((player) => {
            const entry = entryById.get(player.id);
            return {
              id: player.id,
              displayName: player.displayName,
              courseHandicap: computeCourseHandicap(
                entry ?? {
                  handicapIndex: player.handicapIndex,
                  courseHandicapOverride: null,
                },
                tee,
                par,
              ),
            };
          }),
        }));
        const scores = scoresByMatch.get(match.id) ?? [];
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
      });

    bundles.set(round.id, { round, holes, tee, entries, matches });
  }

  return bundles;
}

export async function loadRound(roundId: string): Promise<RoundBundle | null> {
  const bundles = await loadRounds([roundId]);
  return bundles.get(roundId) ?? null;
}

export async function listMatchViews(roundId: string): Promise<MatchView[]> {
  return (await loadRound(roundId))?.matches ?? [];
}

export async function getMatchView(matchId: string): Promise<MatchView | null> {
  const row = await db().one<{ round_id: string }>(
    "SELECT round_id FROM matches WHERE id = ?",
    [matchId],
  );
  if (!row) return null;
  const bundle = await loadRound(row.round_id);
  return bundle?.matches.find((m) => m.id === matchId) ?? null;
}

export async function loadScores(matchId: string): Promise<ScoreRow[]> {
  return db().all<ScoreRow>(
    `SELECT hole, subject_type AS "subjectType", subject_id AS "subjectId", gross, putts
     FROM scores WHERE match_id = ? ORDER BY hole`,
    [matchId],
  );
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

function bundleLeaderboard(bundle: RoundBundle): LeaderboardEntry[] {
  const byId = new Map(bundle.entries.map((e) => [e.playerId, e]));
  const out: LeaderboardEntry[] = [];
  for (const match of bundle.matches) {
    for (const side of match.sides) {
      for (const player of side.players) {
        const entry = byId.get(player.id);
        // The individual net board always plays off the full course handicap;
        // format allowances (90% fourball, 50% foursomes) belong to the match.
        const totals = playerTotals(
          player.id,
          bundle.holes,
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

/** Individual gross/net board for one round, across every match in it. */
export async function roundLeaderboard(roundId: string): Promise<LeaderboardEntry[]> {
  const bundle = await loadRound(roundId);
  return bundle ? bundleLeaderboard(bundle) : [];
}

export interface TeamStanding {
  teamId: string;
  name: string;
  color: string;
  points: number;
}

/** Match play points: 1 for a win, 0.5 each for a halve. */
export async function teamStandings(tournamentId: string): Promise<TeamStanding[]> {
  const [teams, rounds] = await Promise.all([
    listTeams(tournamentId),
    listRounds(tournamentId),
  ]);
  const bundles = await loadRounds(rounds.map((r) => r.id));
  const points = new Map(teams.map((t) => [t.id, 0]));
  for (const bundle of bundles.values()) {
    for (const match of bundle.matches) {
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
    .map((t) => ({
      teamId: t.id,
      name: t.name,
      color: t.color,
      points: points.get(t.id) ?? 0,
    }))
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
export async function tournamentLeaderboard(
  tournamentId: string,
): Promise<TournamentBoardRow[]> {
  const [entries, rounds] = await Promise.all([
    listEntries(tournamentId),
    listRounds(tournamentId),
  ]);
  const bundles = await loadRounds(rounds.map((r) => r.id));
  const map = new Map<string, TournamentBoardRow>();
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

  for (const bundle of bundles.values()) {
    for (const row of bundleLeaderboard(bundle)) {
      const existing = map.get(row.playerId);
      if (!existing || row.holesPlayed === 0) continue;
      existing.gross += row.gross;
      existing.net += row.net;
      existing.toPar += row.toPar;
      existing.netToPar += row.netToPar;
      existing.holesPlayed += row.holesPlayed;
      existing.rounds += 1;
    }
    for (const match of bundle.matches) {
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
  partners: {
    playerId: string;
    name: string;
    wins: number;
    losses: number;
    halves: number;
  }[];
  tournaments: number;
  championships: number;
}

const emptyRecord = (): FormatRecord => ({ wins: 0, losses: 0, halves: 0 });

/** Lifetime record built by replaying every decided match the player was in. */
export async function playerRecord(playerId: string): Promise<PlayerRecord> {
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

  const roundRows = await db().all<{ roundId: string }>(
    `SELECT DISTINCT m.round_id AS "roundId"
     FROM side_players sp
     JOIN match_sides ms ON ms.id = sp.side_id
     JOIN matches m ON m.id = ms.match_id
     WHERE sp.player_id = ?`,
    [playerId],
  );
  const bundles = await loadRounds(roundRows.map((r) => r.roundId));

  const h2h = new Map<
    string,
    { name: string; wins: number; losses: number; halves: number }
  >();
  const partners = new Map<
    string,
    { name: string; wins: number; losses: number; halves: number }
  >();

  for (const bundle of bundles.values()) {
    for (const view of bundle.matches) {
      if (!view.state.decided) continue;
      const mySide = view.sides.find((s) => s.players.some((p) => p.id === playerId));
      if (!mySide) continue;
      const theirSide = view.sides.find((s) => s.id !== mySide.id);
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
  }

  const opponentIds = [...h2h.keys()];
  const usernameRows = opponentIds.length
    ? await db().all<{ id: string; username: string }>(
        "SELECT id, username FROM players WHERE id = ANY(?)",
        [opponentIds],
      )
    : [];
  const usernames = new Map(usernameRows.map((row) => [row.id, row.username]));

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

  const [played, titles] = await Promise.all([
    db().one<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM entries WHERE player_id = ?",
      [playerId],
    ),
    db().one<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM tournaments t
       JOIN entries e ON e.tournament_id = t.id AND e.player_id = ?
       LEFT JOIN teams tm ON tm.id = e.team_id
       WHERE t.champion IS NOT NULL
         AND (t.champion = tm.name
              OR t.champion = (SELECT display_name FROM players WHERE id = ?))`,
      [playerId, playerId],
    ),
  ]);
  record.tournaments = played?.n ?? 0;
  record.championships = titles?.n ?? 0;

  return record;
}

export function winPercent(record: FormatRecord): number | null {
  const played = record.wins + record.losses + record.halves;
  if (played === 0) return null;
  return ((record.wins + record.halves * 0.5) / played) * 100;
}

export async function listWagers(roundId: string): Promise<WagerDef[]> {
  const rows = await db().all<{
    id: string;
    type: WagerDef["type"];
    amount: number;
    match_id: string | null;
    settings: string;
  }>("SELECT * FROM wagers WHERE round_id = ? ORDER BY created_at", [roundId]);
  if (rows.length === 0) return [];

  const links = await db().all<{ wager_id: string; player_id: string }>(
    "SELECT wager_id, player_id FROM wager_players WHERE wager_id = ANY(?)",
    [rows.map((r) => r.id)],
  );
  const byWager = new Map<string, string[]>();
  for (const link of links) {
    const list = byWager.get(link.wager_id) ?? [];
    list.push(link.player_id);
    byWager.set(link.wager_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    matchId: row.match_id,
    settings: JSON.parse(row.settings || "{}"),
    playerIds: byWager.get(row.id) ?? [],
  }));
}

export async function roundLedger(
  roundId: string,
): Promise<Ledger & { players: Record<string, string> }> {
  const bundle = await loadRound(roundId);
  if (!bundle) {
    return { results: [], balances: [], settlements: [], total: 0, players: {} };
  }
  const players: Record<
    string,
    { id: string; displayName: string; courseHandicap: number }
  > = {};
  for (const match of bundle.matches) {
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
    holes: bundle.holes,
    format: bundle.round.format,
    allowance: bundle.round.allowance,
    matches: bundle.matches.map((m) => ({
      id: m.id,
      name: m.name,
      sides: m.sides,
      scores: m.scores,
    })),
    wagers: await listWagers(bundle.round.id),
    players,
  });
  const names: Record<string, string> = {};
  for (const [id, player] of Object.entries(players)) names[id] = player.displayName;
  return { ...ledger, players: names };
}

export interface BoardSummary {
  tournament: TournamentRow;
  rounds: {
    round: RoundRow;
    matches: {
      id: string;
      name: string;
      status: string;
      decided: boolean;
      thru: number;
      sides: Side[];
      winner: string | "halved" | null;
    }[];
  }[];
  teams: TeamStanding[];
  leaderboard: TournamentBoardRow[];
  fetchedAt: string;
}

/** The whole live board for one tournament: rounds, matches, teams, players. */
export async function buildBoard(tournament: TournamentRow): Promise<BoardSummary> {
  const rounds = await listRounds(tournament.id);
  const [bundles, teams, leaderboard] = await Promise.all([
    loadRounds(rounds.map((r) => r.id)),
    teamStandings(tournament.id),
    tournamentLeaderboard(tournament.id),
  ]);
  return {
    tournament,
    rounds: rounds.map((round) => ({
      round,
      matches: (bundles.get(round.id)?.matches ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        status: m.state.status,
        decided: m.state.decided,
        thru: m.state.thru,
        sides: m.sides,
        winner: m.state.winner,
      })),
    })),
    teams,
    leaderboard,
    fetchedAt: new Date().toISOString(),
  };
}
