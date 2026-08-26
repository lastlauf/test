import { currentPlayer } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
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
  const round = await getRound(id);
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
  const next = await db().one<{ n: number }>(
    "SELECT COALESCE(MAX(sequence), 0) + 1 AS n FROM matches WHERE round_id = ?",
    [round.id],
  );
  const sequence = next?.n ?? 1;

  await tx(async (q) => {
    await q.run("INSERT INTO matches (id, round_id, name, sequence) VALUES (?, ?, ?, ?)", [
      matchId,
      round.id,
      body.name?.trim() || `Match ${sequence}`,
      sequence,
    ]);
    for (const [i, side] of sides.entries()) {
      const sideId = uid("sd");
      await q.run(
        "INSERT INTO match_sides (id, match_id, label, team_id) VALUES (?, ?, ?, ?)",
        [sideId, matchId, side.label || (i === 0 ? "A" : "B"), side.teamId ?? null],
      );
      for (const pid of side.playerIds) {
        await q.run("INSERT INTO side_players (side_id, player_id) VALUES (?, ?)", [
          sideId,
          pid,
        ]);
      }
    }
  });

  return json({ matches: await listMatchViews(round.id) }, 201);
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
  await db().run("DELETE FROM matches WHERE id = ? AND round_id = ?", [matchId, id]);
  return json({ matches: await listMatchViews(id) });
}
