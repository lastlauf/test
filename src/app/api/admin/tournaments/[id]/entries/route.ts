import { currentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
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
  if (!getTournament(id)) return fail("Tournament not found.", 404);
  const body = await readJson<Body>(request);
  const ids = body.playerIds ?? [];
  if (!ids.length) return fail("Pick at least one player.");

  const upsert = db().prepare(
    `INSERT INTO entries (tournament_id, player_id, team_id, course_handicap)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (tournament_id, player_id)
     DO UPDATE SET team_id = excluded.team_id, course_handicap = excluded.course_handicap`,
  );
  db().transaction(() => {
    for (const pid of ids) {
      upsert.run(id, pid, body.teamId ?? null, body.courseHandicap ?? null);
    }
  })();

  return json({ entries: listEntries(id) }, 201);
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
  db()
    .prepare("DELETE FROM entries WHERE tournament_id = ? AND player_id = ?")
    .run(id, playerId);
  return json({ entries: listEntries(id) });
}
