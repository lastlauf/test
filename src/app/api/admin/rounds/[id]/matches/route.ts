import { currentPlayer } from "@/lib/auth";
import { db, uid } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { getRound, listMatchViews } from "@/lib/tsi";

interface Body {
  name?: string;
  sides: { label: string; teamId?: string | null; playerIds: string[] }[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player?.is_admin) return fail("Only a TSI admin can set pairings.", 403);
  const { id } = await params;
  const round = getRound(id);
  if (!round) return fail("Round not found.", 404);
  const body = await readJson<Body>(request);
  const sides = body.sides ?? [];
  if (sides.length !== 2) return fail("A match needs exactly two sides.");
  const expected = round.format === "singles" ? 1 : 2;
  for (const side of sides) {
    if (side.playerIds.length !== expected) {
      return fail(
        `${round.format === "singles" ? "Singles" : "This format"} needs ${expected} player${expected === 1 ? "" : "s"} a side.`,
      );
    }
  }

  const matchId = uid("mch");
  const sequence = (
    db()
      .prepare("SELECT COALESCE(MAX(sequence), 0) + 1 AS n FROM matches WHERE round_id = ?")
      .get(round.id) as { n: number }
  ).n;

  db().transaction(() => {
    db()
      .prepare("INSERT INTO matches (id, round_id, name, sequence) VALUES (?, ?, ?, ?)")
      .run(matchId, round.id, body.name?.trim() || `Match ${sequence}`, sequence);
    const side = db().prepare(
      "INSERT INTO match_sides (id, match_id, label, team_id) VALUES (?, ?, ?, ?)",
    );
    const link = db().prepare(
      "INSERT INTO side_players (side_id, player_id) VALUES (?, ?)",
    );
    sides.forEach((s, i) => {
      const sideId = uid("sd");
      side.run(sideId, matchId, s.label || (i === 0 ? "A" : "B"), s.teamId ?? null);
      for (const pid of s.playerIds) link.run(sideId, pid);
    });
  })();

  return json({ matches: listMatchViews(round.id) }, 201);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player?.is_admin) return fail("Only a TSI admin can set pairings.", 403);
  const { id } = await params;
  const matchId = new URL(request.url).searchParams.get("matchId");
  if (!matchId) return fail("Which match?");
  db().prepare("DELETE FROM matches WHERE id = ? AND round_id = ?").run(matchId, id);
  return json({ matches: listMatchViews(id) });
}
