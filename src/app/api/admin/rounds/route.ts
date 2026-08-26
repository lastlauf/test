import { currentPlayer } from "@/lib/auth";
import { db, uid } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { DEFAULT_ALLOWANCE, type Format } from "@/lib/scoring";
import { getTournament, listRounds } from "@/lib/tsi";

interface Body {
  tournamentId: string;
  name: string;
  format: Format;
  courseId: string;
  teeId?: string | null;
  playedOn?: string | null;
  sequence?: number;
  allowance?: number;
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player?.is_admin) return fail("Only a TSI admin can add rounds.", 403);
  const body = await readJson<Body>(request);
  if (!(await getTournament(body.tournamentId))) return fail("Tournament not found.", 404);
  if (!["fourball", "foursome", "singles"].includes(body.format)) {
    return fail("Format must be fourball, foursome or singles.");
  }
  if (!body.courseId) return fail("Pick a course.");

  const id = uid("rnd");
  const next = await db().one<{ n: number }>(
    "SELECT COALESCE(MAX(sequence), 0) + 1 AS n FROM rounds WHERE tournament_id = ?",
    [body.tournamentId],
  );

  await db().run(
    `INSERT INTO rounds (id, tournament_id, name, format, course_id, tee_id, played_on, sequence, allowance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      body.tournamentId,
      body.name?.trim() || "Round",
      body.format,
      body.courseId,
      body.teeId ?? null,
      body.playedOn ?? null,
      body.sequence ?? next?.n ?? 1,
      body.allowance ?? DEFAULT_ALLOWANCE[body.format],
    ],
  );

  return json({ id, rounds: await listRounds(body.tournamentId) }, 201);
}
