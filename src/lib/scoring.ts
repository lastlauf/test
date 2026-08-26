/**
 * Pure scoring engine for the Turkey Slice Invitational.
 *
 * Everything here is side-effect free so it can run on the server (leaderboards,
 * ledgers) and in the browser (optimistic updates while a phone is offline).
 */

export type Format = "fourball" | "foursome" | "singles";

export const FORMAT_LABEL: Record<Format, string> = {
  fourball: "Fourball (best ball)",
  foursome: "Foursome (alternate shot)",
  singles: "Singles",
};

/** USGA-ish default handicap allowances per format. */
export const DEFAULT_ALLOWANCE: Record<Format, number> = {
  fourball: 0.9,
  foursome: 0.5,
  singles: 1,
};

export interface Hole {
  number: number;
  par: number;
  strokeIndex: number;
  yardage?: number | null;
}

export interface SidePlayer {
  id: string;
  displayName: string;
  courseHandicap: number;
}

export interface Side {
  id: string;
  label: string;
  teamId?: string | null;
  teamName?: string | null;
  teamColor?: string | null;
  players: SidePlayer[];
}

export interface ScoreRow {
  hole: number;
  subjectType: "player" | "side";
  subjectId: string;
  gross: number | null;
  putts: number | null;
}

/** Course handicap = index x (slope / 113) + (rating - par). */
export function courseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number,
): number {
  return Math.round(handicapIndex * (slope / 113) + (rating - par));
}

/** How many strokes a playing handicap receives on a hole of the given index. */
export function strokesOnHole(
  playingHandicap: number,
  strokeIndex: number,
  holeCount = 18,
): number {
  if (playingHandicap >= 0) {
    const base = Math.floor(playingHandicap / holeCount);
    const remainder = playingHandicap % holeCount;
    return base + (strokeIndex <= remainder ? 1 : 0);
  }
  const give = -playingHandicap;
  const base = Math.floor(give / holeCount);
  const remainder = give % holeCount;
  const given = base + (strokeIndex > holeCount - remainder ? 1 : 0);
  return given === 0 ? 0 : -given;
}

/**
 * Match-play strokes are taken off the low subject, so the best player in the
 * match plays off scratch and everyone else receives the difference.
 *
 * The scoring subject is the player in fourball/singles and the side in
 * foursome, where the pair plays a single ball.
 */
export function matchStrokes(
  sides: Side[],
  format: Format,
  allowance: number,
): Record<string, number> {
  const raw: Record<string, number> = {};
  if (format === "foursome") {
    for (const side of sides) {
      raw[side.id] =
        side.players.reduce((sum, p) => sum + p.courseHandicap, 0) * allowance;
    }
  } else {
    for (const side of sides) {
      for (const p of side.players) raw[p.id] = p.courseHandicap * allowance;
    }
  }
  const values = Object.values(raw);
  const low = values.length ? Math.min(...values) : 0;
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) out[id] = Math.round(value - low);
  return out;
}

/** Subject ids that carry a score for a side under a given format. */
export function subjectsForSide(
  side: Side,
  format: Format,
): { type: "player" | "side"; id: string; label: string }[] {
  if (format === "foursome") {
    return [
      {
        type: "side",
        id: side.id,
        label: side.players.map((p) => p.displayName).join(" / ") || side.label,
      },
    ];
  }
  return side.players.map((p) => ({
    type: "player" as const,
    id: p.id,
    label: p.displayName,
  }));
}

export interface HoleResult {
  hole: number;
  par: number;
  strokeIndex: number;
  /** Net score for each side, null when nobody on that side has posted yet. */
  net: Record<string, number | null>;
  gross: Record<string, number | null>;
  /** Side id that won the hole, "halved", or null when not yet complete. */
  winner: string | "halved" | null;
  /** Running match differential from the first side's point of view. */
  running: number;
}

export interface MatchState {
  format: Format;
  strokes: Record<string, number>;
  results: HoleResult[];
  /** Holes completed by both sides. */
  thru: number;
  /** Positive = first side up. */
  differential: number;
  decided: boolean;
  /** Side id of the winner, "halved" when finished level, null while live. */
  winner: string | "halved" | null;
  status: string;
}

function scoreKey(hole: number, type: string, id: string) {
  return `${hole}|${type}|${id}`;
}

export function indexScores(scores: ScoreRow[]): Map<string, ScoreRow> {
  const map = new Map<string, ScoreRow>();
  for (const s of scores) map.set(scoreKey(s.hole, s.subjectType, s.subjectId), s);
  return map;
}

/** Net score for one side on one hole (best ball in fourball). */
function sideHoleScore(
  side: Side,
  format: Format,
  hole: Hole,
  index: Map<string, ScoreRow>,
  strokes: Record<string, number>,
): { gross: number | null; net: number | null } {
  const subjects = subjectsForSide(side, format);
  let bestNet: number | null = null;
  let bestGross: number | null = null;
  for (const subject of subjects) {
    const row = index.get(scoreKey(hole.number, subject.type, subject.id));
    if (!row || row.gross == null) continue;
    const net =
      row.gross - strokesOnHole(strokes[subject.id] ?? 0, hole.strokeIndex);
    if (bestNet === null || net < bestNet) {
      bestNet = net;
      bestGross = row.gross;
    }
  }
  return { gross: bestGross, net: bestNet };
}

export function matchState(
  holes: Hole[],
  sides: Side[],
  scores: ScoreRow[],
  format: Format,
  allowance: number,
): MatchState {
  const strokes = matchStrokes(sides, format, allowance);
  const index = indexScores(scores);
  const ordered = [...holes].sort((a, b) => a.number - b.number);
  const [first, second] = sides;
  const results: HoleResult[] = [];

  let differential = 0;
  let thru = 0;
  let decided = false;
  let winner: string | "halved" | null = null;
  let closedDifferential = 0;
  let closedRemaining = 0;

  for (let i = 0; i < ordered.length; i++) {
    const hole = ordered[i];
    const net: Record<string, number | null> = {};
    const gross: Record<string, number | null> = {};
    for (const side of sides) {
      const s = sideHoleScore(side, format, hole, index, strokes);
      net[side.id] = s.net;
      gross[side.id] = s.gross;
    }
    let holeWinner: string | "halved" | null = null;
    if (
      !decided &&
      first &&
      second &&
      net[first.id] != null &&
      net[second.id] != null
    ) {
      const a = net[first.id]!;
      const b = net[second.id]!;
      if (a < b) {
        holeWinner = first.id;
        differential += 1;
      } else if (b < a) {
        holeWinner = second.id;
        differential -= 1;
      } else {
        holeWinner = "halved";
      }
      thru = hole.number;
      const remaining = ordered.length - (i + 1);
      if (Math.abs(differential) > remaining) {
        decided = true;
        winner = differential > 0 ? first.id : second.id;
        closedDifferential = Math.abs(differential);
        closedRemaining = remaining;
      } else if (remaining === 0) {
        decided = true;
        winner = differential === 0 ? "halved" : differential > 0 ? first.id : second.id;
        closedDifferential = Math.abs(differential);
      }
    }
    results.push({
      hole: hole.number,
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      net,
      gross,
      winner: holeWinner,
      running: differential,
    });
  }

  let status: string;
  if (decided && winner === "halved") {
    status = "Halved";
  } else if (decided && winner) {
    const side = sides.find((s) => s.id === winner);
    const margin =
      closedRemaining > 0
        ? `${closedDifferential}&${closedRemaining}`
        : closedDifferential === 1
          ? "1 up"
          : `${closedDifferential} up`;
    status = `${sideName(side)} wins ${margin}`;
  } else if (thru === 0) {
    status = "Not started";
  } else if (differential === 0) {
    status = `All square thru ${thru}`;
  } else {
    const leader = sides.find((s) => s.id === (differential > 0 ? first?.id : second?.id));
    status = `${sideName(leader)} ${Math.abs(differential)} up thru ${thru}`;
  }

  return { format, strokes, results, thru, differential, decided, winner, status };
}

export function sideName(side?: Side): string {
  if (!side) return "—";
  if (side.players.length === 0) return side.label;
  return side.players.map((p) => shortName(p.displayName)).join(" / ");
}

export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export interface PlayerTotals {
  playerId: string;
  gross: number;
  net: number;
  parPlayed: number;
  holesPlayed: number;
  putts: number;
  thru: number;
  toPar: number;
  netToPar: number;
}

/** Gross/net totals for one player across the holes they have posted. */
export function playerTotals(
  playerId: string,
  holes: Hole[],
  scores: ScoreRow[],
  strokes: number,
): PlayerTotals {
  const index = indexScores(scores);
  let gross = 0;
  let net = 0;
  let parPlayed = 0;
  let putts = 0;
  let holesPlayed = 0;
  let thru = 0;
  for (const hole of [...holes].sort((a, b) => a.number - b.number)) {
    const row = index.get(scoreKey(hole.number, "player", playerId));
    if (!row || row.gross == null) continue;
    gross += row.gross;
    net += row.gross - strokesOnHole(strokes, hole.strokeIndex);
    parPlayed += hole.par;
    putts += row.putts ?? 0;
    holesPlayed += 1;
    thru = hole.number;
  }
  return {
    playerId,
    gross,
    net,
    parPlayed,
    holesPlayed,
    putts,
    thru,
    toPar: gross - parPlayed,
    netToPar: net - parPlayed,
  };
}

export function formatToPar(value: number, holesPlayed: number): string {
  if (holesPlayed === 0) return "—";
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : `${value}`;
}
