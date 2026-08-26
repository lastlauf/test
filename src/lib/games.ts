/**
 * Games: a round somebody starts from the app rather than an admin scheduling
 * it. A game is a round with no tournament, a creator, and a single match that
 * other players join until the sides are full.
 */

import { db, tx, uid } from "./db";
import { FORMAT_GUIDES, sideCapacity } from "./game-guides";
import { DEFAULT_ALLOWANCE, type Format } from "./scoring";
import type { RoundRow } from "./tsi";

export { BET_GUIDES, FORMAT_GUIDES, sideCapacity } from "./game-guides";
export type { FormatGuide } from "./game-guides";

export const STANDARD_HOLES: [number, number, number][] = [
  [1, 4, 7], [2, 5, 13], [3, 4, 1], [4, 3, 17], [5, 4, 5], [6, 4, 11],
  [7, 3, 15], [8, 5, 9], [9, 4, 3], [10, 4, 8], [11, 5, 14], [12, 3, 18],
  [13, 4, 2], [14, 4, 10], [15, 4, 6], [16, 3, 16], [17, 5, 12], [18, 4, 4],
];

/**
 * Games need a course for pars and stroke indexes. On a fresh install there
 * isn't one, so the first game lays down a standard par 72 that an admin can
 * edit or replace later.
 */
export async function ensureCourse(): Promise<string> {
  const existing = await db().one<{ id: string }>("SELECT id FROM courses ORDER BY name LIMIT 1");
  if (existing) return existing.id;

  const courseId = uid("crs");
  await tx(async (q) => {
    await q.run("INSERT INTO courses (id, name, city, state) VALUES (?, ?, ?, ?)", [
      courseId,
      "Home Course",
      null,
      null,
    ]);
    for (const [number, par, strokeIndex] of STANDARD_HOLES) {
      await q.run(
        "INSERT INTO holes (id, course_id, number, par, stroke_index) VALUES (?, ?, ?, ?, ?)",
        [uid("hol"), courseId, number, par, strokeIndex],
      );
    }
    await q.run(
      "INSERT INTO tees (id, course_id, name, rating, slope) VALUES (?, ?, ?, ?, ?)",
      [uid("tee"), courseId, "Default", 72.0, 113],
    );
  });
  return courseId;
}

export interface GameSummary {
  round: RoundRow;
  matchId: string;
  createdBy: string | null;
  creatorName: string | null;
  players: { id: string; displayName: string; username: string; side: string }[];
  capacity: number;
  full: boolean;
}

const GAME_SELECT = `
  SELECT r.*, m.id AS "matchId", p.display_name AS "creatorName"
  FROM rounds r
  JOIN matches m ON m.round_id = r.id
  LEFT JOIN players p ON p.id = r.created_by
  WHERE r.tournament_id IS NULL`;

async function decorate(
  rows: (RoundRow & { matchId: string; creatorName: string | null })[],
): Promise<GameSummary[]> {
  if (rows.length === 0) return [];
  const players = await db().all<{
    roundId: string;
    id: string;
    displayName: string;
    username: string;
    side: string;
  }>(
    `SELECT ms.match_id AS "matchId", m.round_id AS "roundId", p.id,
            p.display_name AS "displayName", p.username, ms.label AS side
     FROM match_sides ms
     JOIN matches m ON m.id = ms.match_id
     JOIN side_players sp ON sp.side_id = ms.id
     JOIN players p ON p.id = sp.player_id
     WHERE m.round_id = ANY(?)
     ORDER BY ms.label, lower(p.display_name)`,
    [rows.map((r) => r.id)],
  );
  return rows.map((row) => {
    const mine = players.filter((p) => (p as { roundId: string }).roundId === row.id);
    const capacity = sideCapacity(row.format) * 2;
    return {
      round: row,
      matchId: row.matchId,
      createdBy: row.created_by,
      creatorName: row.creatorName,
      players: mine.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        username: p.username,
        side: p.side,
      })),
      capacity,
      full: mine.length >= capacity,
    };
  });
}

export async function listOpenGames(): Promise<GameSummary[]> {
  const rows = await db().all<RoundRow & { matchId: string; creatorName: string | null }>(
    `${GAME_SELECT} AND r.status <> 'archived' ORDER BY r.played_on DESC NULLS LAST, r.id DESC`,
  );
  return decorate(rows);
}

export async function listArchivedGames(): Promise<GameSummary[]> {
  const rows = await db().all<RoundRow & { matchId: string; creatorName: string | null }>(
    `${GAME_SELECT} AND r.status = 'archived' ORDER BY r.played_on DESC NULLS LAST, r.id DESC`,
  );
  return decorate(rows);
}

export async function getGame(roundId: string): Promise<GameSummary | null> {
  const rows = await db().all<RoundRow & { matchId: string; creatorName: string | null }>(
    `${GAME_SELECT} AND r.id = ?`,
    [roundId],
  );
  return (await decorate(rows))[0] ?? null;
}

/** Starts a game and puts its creator on the first side. */
export async function createGame(
  creatorId: string,
  format: Format,
  courseId?: string | null,
): Promise<{ roundId: string; matchId: string }> {
  const course = courseId || (await ensureCourse());
  const tee = await db().one<{ id: string }>(
    "SELECT id FROM tees WHERE course_id = ? ORDER BY yardage DESC NULLS LAST LIMIT 1",
    [course],
  );
  const roundId = uid("rnd");
  const matchId = uid("mch");
  const sideA = uid("sd");
  const sideB = uid("sd");
  const guide = FORMAT_GUIDES.find((g) => g.format === format)!;

  await tx(async (q) => {
    await q.run(
      `INSERT INTO rounds (id, tournament_id, name, format, course_id, tee_id, played_on,
                           sequence, allowance, status, created_by)
       VALUES (?, NULL, ?, ?, ?, ?, ?, 1, ?, 'open', ?)`,
      [
        roundId,
        guide.name,
        format,
        course,
        tee?.id ?? null,
        new Date().toISOString().slice(0, 10),
        DEFAULT_ALLOWANCE[format],
        creatorId,
      ],
    );
    await q.run("INSERT INTO matches (id, round_id, name, sequence, status) VALUES (?, ?, ?, 1, 'open')", [
      matchId,
      roundId,
      guide.name,
    ]);
    await q.run("INSERT INTO match_sides (id, match_id, label) VALUES (?, ?, 'A')", [sideA, matchId]);
    await q.run("INSERT INTO match_sides (id, match_id, label) VALUES (?, ?, 'B')", [sideB, matchId]);
    await q.run("INSERT INTO side_players (side_id, player_id) VALUES (?, ?)", [sideA, creatorId]);
  });

  return { roundId, matchId };
}

export type JoinResult =
  | { ok: true; side: string }
  | { ok: false; reason: "not-found" | "already-in" | "full" | "archived" };

/** Any signed-in player can take a free seat, on whichever side has room. */
export async function joinGame(roundId: string, playerId: string): Promise<JoinResult> {
  const game = await getGame(roundId);
  if (!game) return { ok: false, reason: "not-found" };
  if (game.round.status === "archived") return { ok: false, reason: "archived" };
  if (game.players.some((p) => p.id === playerId)) return { ok: false, reason: "already-in" };

  const sides = await db().all<{ id: string; label: string }>(
    "SELECT id, label FROM match_sides WHERE match_id = ? ORDER BY label",
    [game.matchId],
  );
  const capacity = sideCapacity(game.round.format);
  const counts = new Map(sides.map((s) => [s.label, game.players.filter((p) => p.side === s.label).length]));
  // Fill the emptier side first so a game balances itself as people arrive.
  const target = sides
    .filter((s) => (counts.get(s.label) ?? 0) < capacity)
    .sort((a, b) => (counts.get(a.label) ?? 0) - (counts.get(b.label) ?? 0))[0];
  if (!target) return { ok: false, reason: "full" };

  await db().run("INSERT INTO side_players (side_id, player_id) VALUES (?, ?)", [
    target.id,
    playerId,
  ]);
  return { ok: true, side: target.label };
}

/** Only the player who started a game can put it in the archive. */
export async function archiveGame(
  roundId: string,
  playerId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const game = await getGame(roundId);
  if (!game) return { ok: false, reason: "That game no longer exists." };
  if (game.createdBy !== playerId) {
    return { ok: false, reason: "Only the player who started a game can archive it." };
  }
  await db().run("UPDATE rounds SET status = 'archived' WHERE id = ?", [roundId]);
  await db().run("UPDATE matches SET status = 'complete' WHERE round_id = ?", [roundId]);
  return { ok: true };
}
