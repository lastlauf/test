import { currentPlayer } from "@/lib/auth";
import { db, tx } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { getTournament, listEntries } from "@/lib/tsi";

interface Body {
  playerIds: string[];
  teamId?: string | null;
  courseHandicap?: number | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player?.is_admin) return fail("Only a TSI admin can manage the field.", 403);
  const { id } = await params;
  if (!(await getTournament(id))) return fail("Tournament not found.", 404);
  const body = await readJson<Body>(request);
  const ids = body.playerIds ?? [];
  if (!ids.length) return fail("Pick at least one player.");

  await tx(async (q) => {
    for (const pid of ids) {
      await q.run(
        `INSERT INTO entries (tournament_id, player_id, team_id, course_handicap)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (tournament_id, player_id)
         DO UPDATE SET team_id = excluded.team_id, course_handicap = excluded.course_handicap`,
        [id, pid, body.teamId ?? null, body.courseHandicap ?? null],
      );
    }
  });

  return json({ entries: await listEntries(id) }, 201);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player?.is_admin) return fail("Only a TSI admin can manage the field.", 403);
  const { id } = await params;
  const playerId = new URL(request.url).searchParams.get("playerId");
  if (!playerId) return fail("Which player?");
  await db().run("DELETE FROM entries WHERE tournament_id = ? AND player_id = ?", [
    id,
    playerId,
  ]);
  return json({ entries: await listEntries(id) });
}
