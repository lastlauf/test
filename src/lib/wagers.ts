/**
 * Side-wager maths: Nassau, Skins and head-to-head match play, plus the
 * "who owes whom" ledger. v1 calculates balances only — no money moves.
 */

import {
  type Format,
  type Hole,
  type ScoreRow,
  type Side,
  indexScores,
  matchState,
  matchStrokes,
  shortName,
  strokesOnHole,
} from "./scoring";

export type WagerType = "match" | "nassau" | "skins" | "h2h";

export const WAGER_LABEL: Record<WagerType, string> = {
  match: "Match",
  nassau: "Nassau",
  skins: "Skins",
  h2h: "Head-to-head",
};

export interface WagerSettings {
  /** Skins are decided on net scores by default. */
  mode?: "net" | "gross";
  /** Tied holes push their value onto the next hole. */
  carryover?: boolean;
  /** Head-to-head participants. */
  playerA?: string;
  playerB?: string;
}

export interface WagerDef {
  id: string;
  type: WagerType;
  amount: number;
  matchId: string | null;
  settings: WagerSettings;
  playerIds: string[];
}

export interface MatchContext {
  id: string;
  name: string;
  sides: Side[];
  scores: ScoreRow[];
}

export interface LedgerContext {
  holes: Hole[];
  format: Format;
  allowance: number;
  matches: MatchContext[];
  wagers: WagerDef[];
  players: Record<string, { id: string; displayName: string; courseHandicap: number }>;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
  reason: string;
}

export interface WagerResult {
  wagerId: string;
  type: WagerType;
  title: string;
  lines: string[];
  transfers: Transfer[];
  pending: boolean;
}

export interface Ledger {
  results: WagerResult[];
  balances: { playerId: string; amount: number }[];
  settlements: { from: string; to: string; amount: number }[];
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** $20 rather than $20.00; cents only when they exist. */
const money = (n: number) =>
  `$${n.toFixed(2).replace(/\.00$/, "")}`;

/** Split `amount` from each loser to each winner, keeping the pot at `amount`. */
function splitTransfers(
  losers: string[],
  winners: string[],
  amount: number,
  reason: string,
): Transfer[] {
  if (!losers.length || !winners.length || amount === 0) return [];
  const each = amount / (losers.length * winners.length);
  const out: Transfer[] = [];
  for (const from of losers) {
    for (const to of winners) {
      out.push({ from, to, amount: round2(each), reason });
    }
  }
  return out;
}

function segmentState(
  holes: Hole[],
  match: MatchContext,
  format: Format,
  allowance: number,
  from: number,
  to: number,
) {
  const slice = holes.filter((h) => h.number >= from && h.number <= to);
  // Strokes are allocated across the full round, then applied to the segment.
  const full = matchState(holes, match.sides, match.scores, format, allowance);
  const strokes = full.strokes;
  const index = indexScores(match.scores);
  const [a, b] = match.sides;
  let differential = 0;
  let played = 0;
  for (const hole of slice) {
    const netFor = (side: Side): number | null => {
      let best: number | null = null;
      const subjects =
        format === "foursome"
          ? [{ id: side.id }]
          : side.players.map((p) => ({ id: p.id }));
      for (const subject of subjects) {
        const row = index.get(
          `${hole.number}|${format === "foursome" ? "side" : "player"}|${subject.id}`,
        );
        if (!row || row.gross == null) continue;
        const net =
          row.gross - strokesOnHole(strokes[subject.id] ?? 0, hole.strokeIndex);
        if (best === null || net < best) best = net;
      }
      return best;
    };
    const na = a ? netFor(a) : null;
    const nb = b ? netFor(b) : null;
    if (na == null || nb == null) continue;
    played += 1;
    if (na < nb) differential += 1;
    else if (nb < na) differential -= 1;
  }
  return { differential, played, holes: slice.length };
}

/** One stake on the outright result: who wins the match, full stop. */
function matchResult(
  wager: WagerDef,
  ctx: LedgerContext,
  match: MatchContext,
): WagerResult {
  const state = matchState(ctx.holes, match.sides, match.scores, ctx.format, ctx.allowance);
  const [a, b] = match.sides;
  const teamA = a?.players.map((p) => p.id) ?? [];
  const teamB = b?.players.map((p) => p.id) ?? [];
  const lines: string[] = [];
  const transfers: Transfer[] = [];

  if (!state.decided) {
    lines.push(state.thru === 0 ? "Not started" : `${state.status} — not settled`);
  } else if (state.winner === "halved") {
    lines.push("Match halved — no money");
  } else {
    const winnerIsA = state.winner === a?.id;
    lines.push(`${state.status} — ${money(wager.amount)}`);
    transfers.push(
      ...splitTransfers(
        winnerIsA ? teamB : teamA,
        winnerIsA ? teamA : teamB,
        wager.amount,
        "Match",
      ),
    );
  }

  return {
    wagerId: wager.id,
    type: "match",
    title: `Match · ${sideLabel(a)} v ${sideLabel(b)} · ${money(wager.amount)}`,
    lines,
    transfers,
    pending: !state.decided,
  };
}

function nassauResult(
  wager: WagerDef,
  ctx: LedgerContext,
  match: MatchContext,
): WagerResult {
  const [a, b] = match.sides;
  const teamA = a?.players.map((p) => p.id) ?? [];
  const teamB = b?.players.map((p) => p.id) ?? [];
  const segments: { key: string; label: string; from: number; to: number }[] = [
    { key: "front", label: "Front 9", from: 1, to: 9 },
    { key: "back", label: "Back 9", from: 10, to: 18 },
    { key: "overall", label: "Overall", from: 1, to: 18 },
  ];
  const lines: string[] = [];
  const transfers: Transfer[] = [];
  let pending = false;

  for (const segment of segments) {
    const state = segmentState(
      ctx.holes,
      match,
      ctx.format,
      ctx.allowance,
      segment.from,
      segment.to,
    );
    if (state.holes === 0) continue;
    const complete = state.played === state.holes;
    if (!complete) pending = true;
    const leaderLabel =
      state.differential === 0
        ? "all square"
        : `${sideLabel(state.differential > 0 ? a : b)} ${Math.abs(state.differential)} up`;
    if (!complete) {
      lines.push(
        `${segment.label}: ${leaderLabel} thru ${state.played} of ${state.holes} — not settled`,
      );
      continue;
    }
    if (state.differential === 0) {
      lines.push(`${segment.label}: halved — no money`);
      continue;
    }
    const winners = state.differential > 0 ? teamA : teamB;
    const losers = state.differential > 0 ? teamB : teamA;
    lines.push(
      `${segment.label}: ${sideLabel(state.differential > 0 ? a : b)} wins ${Math.abs(state.differential)} up — ${money(wager.amount)}`,
    );
    transfers.push(
      ...splitTransfers(losers, winners, wager.amount, `Nassau ${segment.label}`),
    );
  }

  return {
    wagerId: wager.id,
    type: "nassau",
    title: `Nassau · ${match.name} · ${money(wager.amount)} a side`,
    lines,
    transfers,
    pending,
  };
}

function sideLabel(side?: Side): string {
  if (!side) return "—";
  return side.players.map((p) => shortName(p.displayName)).join(" / ") || side.label;
}

/** Strokes for a free-standing bet: full difference off the low participant. */
function offLowStrokes(
  ctx: LedgerContext,
  playerIds: string[],
): Record<string, number> {
  const handicaps = playerIds.map((id) => ctx.players[id]?.courseHandicap ?? 0);
  const low = handicaps.length ? Math.min(...handicaps) : 0;
  const out: Record<string, number> = {};
  playerIds.forEach((id, i) => {
    out[id] = Math.round(handicaps[i] - low);
  });
  return out;
}

/** Every posted player score for the round, keyed hole -> player -> gross. */
function roundScores(ctx: LedgerContext): Map<number, Map<string, number>> {
  const byHole = new Map<number, Map<string, number>>();
  for (const match of ctx.matches) {
    for (const score of match.scores) {
      if (score.subjectType !== "player" || score.gross == null) continue;
      let holeMap = byHole.get(score.hole);
      if (!holeMap) {
        holeMap = new Map();
        byHole.set(score.hole, holeMap);
      }
      holeMap.set(score.subjectId, score.gross);
    }
  }
  return byHole;
}

function skinsResult(wager: WagerDef, ctx: LedgerContext): WagerResult {
  const participants = wager.playerIds;
  const useNet = (wager.settings.mode ?? "net") === "net";
  const carryover = wager.settings.carryover ?? true;
  const strokes = useNet ? offLowStrokes(ctx, participants) : {};
  const byHole = roundScores(ctx);
  const lines: string[] = [];
  const transfers: Transfer[] = [];
  let carry = 1;
  let pending = false;

  for (const hole of [...ctx.holes].sort((a, b) => a.number - b.number)) {
    const holeScores = byHole.get(hole.number);
    const posted = participants.filter((id) => holeScores?.get(id) != null);
    if (posted.length < participants.length) {
      pending = true;
      continue;
    }
    let best = Number.POSITIVE_INFINITY;
    let winners: string[] = [];
    for (const id of posted) {
      const gross = holeScores!.get(id)!;
      const value = useNet
        ? gross - strokesOnHole(strokes[id] ?? 0, hole.strokeIndex)
        : gross;
      if (value < best) {
        best = value;
        winners = [id];
      } else if (value === best) {
        winners.push(id);
      }
    }
    if (winners.length === 1) {
      const value = wager.amount * carry;
      const winner = winners[0];
      const losers = participants.filter((id) => id !== winner);
      lines.push(
        `Hole ${hole.number}: ${name(ctx, winner)} wins ${carry > 1 ? `${carry} skins` : "a skin"} with ${useNet ? "net" : "gross"} ${best} — ${money(value * losers.length)}`,
      );
      for (const loser of losers) {
        transfers.push({
          from: loser,
          to: winner,
          amount: round2(value),
          reason: `Skin hole ${hole.number}`,
        });
      }
      carry = 1;
    } else if (carryover) {
      carry += 1;
    }
  }
  if (carry > 1) {
    lines.push(`${carry - 1} skin${carry - 1 === 1 ? "" : "s"} still carried over`);
  }
  if (!lines.length) lines.push("No skins decided yet");

  return {
    wagerId: wager.id,
    type: "skins",
    title: `Skins · ${money(wager.amount)} a skin, per player · ${useNet ? "net" : "gross"}${carryover ? ", carryover" : ""}`,
    lines,
    transfers,
    pending,
  };
}

function h2hResult(wager: WagerDef, ctx: LedgerContext): WagerResult {
  const [a, b] = wager.playerIds;
  const strokes = offLowStrokes(ctx, [a, b]);
  const byHole = roundScores(ctx);
  let differential = 0;
  let played = 0;
  const total = ctx.holes.length;
  for (const hole of [...ctx.holes].sort((x, y) => x.number - y.number)) {
    const scores = byHole.get(hole.number);
    const ga = scores?.get(a);
    const gb = scores?.get(b);
    if (ga == null || gb == null) continue;
    played += 1;
    const na = ga - strokesOnHole(strokes[a] ?? 0, hole.strokeIndex);
    const nb = gb - strokesOnHole(strokes[b] ?? 0, hole.strokeIndex);
    if (na < nb) differential += 1;
    else if (nb < na) differential -= 1;
  }
  const remaining = total - played;
  const decided = Math.abs(differential) > remaining;
  const lines: string[] = [];
  const transfers: Transfer[] = [];
  if (played === 0) {
    lines.push("Not started");
  } else if (!decided && remaining > 0) {
    lines.push(
      differential === 0
        ? `All square thru ${played}`
        : `${name(ctx, differential > 0 ? a : b)} ${Math.abs(differential)} up thru ${played} — not settled`,
    );
  } else if (differential === 0) {
    lines.push("Halved — no money");
  } else {
    const winner = differential > 0 ? a : b;
    const loser = differential > 0 ? b : a;
    lines.push(
      `${name(ctx, winner)} beats ${name(ctx, loser)} ${Math.abs(differential)}${remaining > 0 ? `&${remaining}` : " up"} — ${money(wager.amount)}`,
    );
    transfers.push({
      from: loser,
      to: winner,
      amount: round2(wager.amount),
      reason: "Head-to-head",
    });
  }
  return {
    wagerId: wager.id,
    type: "h2h",
    title: `Head to head · ${name(ctx, a)} v ${name(ctx, b)} · ${money(wager.amount)}`,
    lines,
    transfers,
    pending: !decided && remaining > 0,
  };
}

function name(ctx: LedgerContext, playerId: string): string {
  const player = ctx.players[playerId];
  return player ? shortName(player.displayName) : "Unknown";
}

/** Reduce pairwise transfers to the fewest settlements that clear balances. */
export function simplify(
  balances: { playerId: string; amount: number }[],
): { from: string; to: string; amount: number }[] {
  const debtors = balances
    .filter((b) => b.amount < -0.004)
    .map((b) => ({ ...b, amount: -b.amount }))
    .sort((x, y) => y.amount - x.amount);
  const creditors = balances
    .filter((b) => b.amount > 0.004)
    .map((b) => ({ ...b }))
    .sort((x, y) => y.amount - x.amount);
  const out: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0.004) {
      out.push({
        from: debtors[i].playerId,
        to: creditors[j].playerId,
        amount: round2(pay),
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount <= 0.004) i += 1;
    if (creditors[j].amount <= 0.004) j += 1;
  }
  return out;
}

export function computeLedger(ctx: LedgerContext): Ledger {
  const results: WagerResult[] = [];
  for (const wager of ctx.wagers) {
    if (wager.type === "match") {
      const match = ctx.matches.find((m) => m.id === wager.matchId) ?? ctx.matches[0];
      if (!match) continue;
      results.push(matchResult(wager, ctx, match));
    } else if (wager.type === "nassau") {
      const match = ctx.matches.find((m) => m.id === wager.matchId);
      if (!match) continue;
      results.push(nassauResult(wager, ctx, match));
    } else if (wager.type === "skins") {
      if (wager.playerIds.length < 2) continue;
      results.push(skinsResult(wager, ctx));
    } else if (wager.type === "h2h") {
      if (wager.playerIds.length !== 2) continue;
      results.push(h2hResult(wager, ctx));
    }
  }

  const net = new Map<string, number>();
  let total = 0;
  for (const result of results) {
    for (const transfer of result.transfers) {
      net.set(transfer.from, (net.get(transfer.from) ?? 0) - transfer.amount);
      net.set(transfer.to, (net.get(transfer.to) ?? 0) + transfer.amount);
      total += transfer.amount;
    }
  }
  const balances = [...net.entries()]
    .map(([playerId, amount]) => ({ playerId, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);

  return { results, balances, settlements: simplify(balances), total: round2(total) };
}

export { matchStrokes };
