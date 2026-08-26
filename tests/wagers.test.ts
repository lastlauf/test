import assert from "node:assert/strict";
import test from "node:test";
import type { Hole, ScoreRow, Side } from "../src/lib/scoring";
import { computeLedger, simplify, type LedgerContext } from "../src/lib/wagers";

const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));

function side(id: string, ids: string[]): Side {
  return {
    id,
    label: id,
    players: ids.map((p) => ({ id: p, displayName: p, courseHandicap: 0 })),
  };
}

function rows(id: string, grosses: (number | null)[]): ScoreRow[] {
  return grosses.map((gross, i) => ({
    hole: i + 1,
    subjectType: "player" as const,
    subjectId: id,
    gross,
    putts: null,
  }));
}

const scratch = (ids: string[]) =>
  Object.fromEntries(
    ids.map((id) => [id, { id, displayName: id, courseHandicap: 0 }]),
  );

/** A wins the front, B wins the back, all square overall. */
function nassauContext(): LedgerContext {
  const a = [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const b = [4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 4, 4, 4, 4, 4, 4];
  return {
    holes: HOLES,
    format: "singles",
    allowance: 1,
    matches: [
      {
        id: "m1",
        name: "Match 1",
        sides: [side("A", ["a"]), side("B", ["b"])],
        scores: [...rows("a", a), ...rows("b", b)],
      },
    ],
    wagers: [
      { id: "w1", type: "nassau", amount: 20, matchId: "m1", settings: {}, playerIds: [] },
    ],
    players: scratch(["a", "b"]),
  };
}

test("nassau settles front, back and overall separately", () => {
  const ledger = computeLedger(nassauContext());
  const [result] = ledger.results;
  assert.equal(result.lines.length, 3);
  assert.match(result.lines[0], /^Front 9: a wins 3 up/);
  assert.match(result.lines[1], /^Back 9: b wins 3 up/);
  assert.match(result.lines[2], /^Overall: halved/);
  // Two $20 segments cancel out.
  assert.equal(ledger.total, 40);
  assert.deepEqual(
    [...ledger.balances].sort((x, y) => x.playerId.localeCompare(y.playerId)),
    [
      { playerId: "a", amount: 0 },
      { playerId: "b", amount: 0 },
    ],
  );
});

test("a fourball nassau splits the stake across both partners", () => {
  const context = nassauContext();
  context.format = "fourball";
  context.matches[0].sides = [side("A", ["a", "a2"]), side("B", ["b", "b2"])];
  context.matches[0].scores.push(...rows("a2", Array(18).fill(9)));
  context.matches[0].scores.push(...rows("b2", Array(18).fill(9)));
  context.players = scratch(["a", "a2", "b", "b2"]);
  const ledger = computeLedger(context);
  const front = ledger.results[0].transfers.filter((t) => t.reason.includes("Front"));
  assert.equal(front.length, 4);
  // $20 pot: each loser pays $10, split $5 to each winner.
  assert.equal(front.every((t) => t.amount === 5), true);
});

test("skins carry over on a tie and pay every other player", () => {
  const ledger = computeLedger({
    holes: HOLES.slice(0, 3),
    format: "singles",
    allowance: 1,
    matches: [
      {
        id: "m1",
        name: "Match 1",
        sides: [side("A", ["a"]), side("B", ["b"])],
        scores: [...rows("a", [4, 3, 4]), ...rows("b", [4, 4, 4])],
      },
    ],
    wagers: [
      {
        id: "w1",
        type: "skins",
        amount: 5,
        matchId: null,
        settings: { mode: "gross", carryover: true },
        playerIds: ["a", "b"],
      },
    ],
    players: scratch(["a", "b"]),
  });
  const [result] = ledger.results;
  // Hole 1 halves and carries, so hole 2 is worth two skins.
  assert.match(result.lines[0], /Hole 2: a wins 2 skins/);
  assert.equal(ledger.total, 10);
});

test("head-to-head pays the winner once the match is closed out", () => {
  const a = [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const b = Array(18).fill(4);
  const ledger = computeLedger({
    holes: HOLES,
    format: "singles",
    allowance: 1,
    matches: [
      {
        id: "m1",
        name: "Match 1",
        sides: [side("A", ["a"]), side("B", ["b"])],
        scores: [...rows("a", a), ...rows("b", b)],
      },
    ],
    wagers: [
      { id: "w1", type: "h2h", amount: 50, matchId: null, settings: {}, playerIds: ["a", "b"] },
    ],
    players: scratch(["a", "b"]),
  });
  assert.match(ledger.results[0].lines[0], /a beats b 3 up/);
  assert.deepEqual(ledger.settlements, [{ from: "b", to: "a", amount: 50 }]);
});

test("an unfinished bet does not move money", () => {
  const ledger = computeLedger({
    holes: HOLES,
    format: "singles",
    allowance: 1,
    matches: [
      {
        id: "m1",
        name: "Match 1",
        sides: [side("A", ["a"]), side("B", ["b"])],
        scores: [...rows("a", [4, 4]), ...rows("b", [5, 5])],
      },
    ],
    wagers: [
      { id: "w1", type: "h2h", amount: 50, matchId: null, settings: {}, playerIds: ["a", "b"] },
    ],
    players: scratch(["a", "b"]),
  });
  assert.equal(ledger.results[0].pending, true);
  assert.equal(ledger.total, 0);
});

test("settlements are reduced to the fewest payments", () => {
  const settlements = simplify([
    { playerId: "a", amount: -30 },
    { playerId: "b", amount: 10 },
    { playerId: "c", amount: 20 },
  ]);
  assert.deepEqual(settlements, [
    { from: "a", to: "c", amount: 20 },
    { from: "a", to: "b", amount: 10 },
  ]);
});

test("a match bet pays only once the result is decided", () => {
  const context = nassauContext();
  context.wagers = [
    { id: "w1", type: "match", amount: 40, matchId: "m1", settings: {}, playerIds: [] },
  ];
  const ledger = computeLedger(context);
  // Front nine to a, back nine to b, so the match itself is all square.
  assert.match(ledger.results[0].lines[0], /halved/);
  assert.equal(ledger.total, 0);
});

test("a match bet splits the stake across the winning side", () => {
  const a = [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const b = Array(18).fill(4);
  const ledger = computeLedger({
    holes: HOLES,
    format: "fourball",
    allowance: 1,
    matches: [
      {
        id: "m1",
        name: "Match 1",
        sides: [side("A", ["a", "a2"]), side("B", ["b", "b2"])],
        scores: [
          ...rows("a", a),
          ...rows("a2", Array(18).fill(9)),
          ...rows("b", b),
          ...rows("b2", Array(18).fill(9)),
        ],
      },
    ],
    wagers: [
      { id: "w1", type: "match", amount: 40, matchId: "m1", settings: {}, playerIds: [] },
    ],
    players: scratch(["a", "a2", "b", "b2"]),
  });
  assert.equal(ledger.total, 40);
  // Each loser pays 20, split 10 to each winner: the pot stays at the stake.
  assert.equal(ledger.results[0].transfers.every((t) => t.amount === 10), true);
  assert.equal(ledger.results[0].transfers.length, 4);
});
