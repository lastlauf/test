import assert from "node:assert/strict";
import test from "node:test";
import {
  courseHandicap,
  matchState,
  matchStrokes,
  playerTotals,
  strokesOnHole,
  type Hole,
  type ScoreRow,
  type Side,
} from "../src/lib/scoring";

const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));

function side(id: string, players: { id: string; hcp: number }[]): Side {
  return {
    id,
    label: id,
    players: players.map((p) => ({
      id: p.id,
      displayName: p.id,
      courseHandicap: p.hcp,
    })),
  };
}

/** Post the same gross for every listed subject across the given holes. */
function scores(
  entries: { id: string; type?: "player" | "side"; grosses: number[] }[],
): ScoreRow[] {
  const rows: ScoreRow[] = [];
  for (const entry of entries) {
    entry.grosses.forEach((gross, i) => {
      rows.push({
        hole: i + 1,
        subjectType: entry.type ?? "player",
        subjectId: entry.id,
        gross,
        putts: null,
      });
    });
  }
  return rows;
}

test("course handicap follows the slope formula", () => {
  assert.equal(courseHandicap(10, 113, 72, 72), 10);
  assert.equal(courseHandicap(10, 136, 72.4, 72), 12);
  assert.equal(courseHandicap(0, 155, 75.1, 72), 3);
});

test("strokes are spread by stroke index and wrap past 18", () => {
  assert.equal(strokesOnHole(18, 1), 1);
  assert.equal(strokesOnHole(18, 18), 1);
  assert.equal(strokesOnHole(20, 2), 2);
  assert.equal(strokesOnHole(20, 3), 1);
  assert.equal(strokesOnHole(5, 5), 1);
  assert.equal(strokesOnHole(5, 6), 0);
  assert.equal(strokesOnHole(0, 1), 0);
});

test("a plus handicap gives strokes back on the easiest holes", () => {
  assert.equal(strokesOnHole(-2, 18), -1);
  assert.equal(strokesOnHole(-2, 17), -1);
  assert.equal(strokesOnHole(-2, 16), 0);
});

test("match strokes come off the low player", () => {
  const sides = [side("A", [{ id: "a1", hcp: 4 }, { id: "a2", hcp: 20 }]), side("B", [
    { id: "b1", hcp: 10 },
    { id: "b2", hcp: 14 },
  ])];
  const strokes = matchStrokes(sides, "fourball", 1);
  assert.deepEqual(strokes, { a1: 0, a2: 16, b1: 6, b2: 10 });
});

test("fourball applies the 90% allowance", () => {
  const sides = [side("A", [{ id: "a1", hcp: 0 }]), side("B", [{ id: "b1", hcp: 10 }])];
  assert.equal(matchStrokes(sides, "fourball", 0.9).b1, 9);
});

test("foursomes score as one side off half the combined handicap", () => {
  const sides = [
    side("A", [{ id: "a1", hcp: 4 }, { id: "a2", hcp: 6 }]),
    side("B", [{ id: "b1", hcp: 10 }, { id: "b2", hcp: 20 }]),
  ];
  const strokes = matchStrokes(sides, "foursome", 0.5);
  assert.deepEqual(strokes, { A: 0, B: 10 });
});

test("fourball takes the better ball on each hole", () => {
  const sides = [
    side("A", [{ id: "a1", hcp: 0 }, { id: "a2", hcp: 0 }]),
    side("B", [{ id: "b1", hcp: 0 }, { id: "b2", hcp: 0 }]),
  ];
  const state = matchState(
    HOLES,
    sides,
    scores([
      { id: "a1", grosses: [5] },
      { id: "a2", grosses: [3] },
      { id: "b1", grosses: [4] },
      { id: "b2", grosses: [4] },
    ]),
    "fourball",
    1,
  );
  assert.equal(state.results[0].winner, "A");
  assert.equal(state.differential, 1);
  assert.equal(state.status, "a1 / a2 1 up thru 1");
});

test("a match closes out 3&2 and ignores later holes", () => {
  const sides = [side("A", [{ id: "a", hcp: 0 }]), side("B", [{ id: "b", hcp: 0 }])];
  // A wins holes 1-3, then everything is halved until the close on 16.
  const a = [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const b = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const state = matchState(
    HOLES,
    sides,
    scores([{ id: "a", grosses: a }, { id: "b", grosses: b }]),
    "singles",
    1,
  );
  assert.equal(state.decided, true);
  assert.equal(state.winner, "A");
  assert.equal(state.thru, 16);
  assert.equal(state.status, "a wins 3&2");
});

test("level after 18 is halved", () => {
  const sides = [side("A", [{ id: "a", hcp: 0 }]), side("B", [{ id: "b", hcp: 0 }])];
  const level = Array.from({ length: 18 }, () => 4);
  const state = matchState(
    HOLES,
    sides,
    scores([{ id: "a", grosses: level }, { id: "b", grosses: level }]),
    "singles",
    1,
  );
  assert.equal(state.winner, "halved");
  assert.equal(state.status, "Halved");
});

test("strokes decide holes in a net match", () => {
  const sides = [side("A", [{ id: "a", hcp: 0 }]), side("B", [{ id: "b", hcp: 18 }])];
  const state = matchState(
    HOLES,
    sides,
    scores([{ id: "a", grosses: [4] }, { id: "b", grosses: [5] }]),
    "singles",
    1,
  );
  // B gets a shot on every hole here, so a gross 5 is a net 4 and the hole halves.
  assert.equal(state.results[0].winner, "halved");
});

test("player totals count only posted holes", () => {
  const totals = playerTotals(
    "a",
    HOLES,
    scores([{ id: "a", grosses: [5, 4, 6] }]),
    18,
  );
  assert.equal(totals.holesPlayed, 3);
  assert.equal(totals.gross, 15);
  assert.equal(totals.toPar, 3);
  assert.equal(totals.net, 12);
  assert.equal(totals.netToPar, 0);
  assert.equal(totals.thru, 3);
});
