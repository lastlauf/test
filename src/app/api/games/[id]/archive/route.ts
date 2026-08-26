import { currentPlayer } from "@/lib/auth";
import { fail, json } from "@/lib/api";
import { archiveGame } from "@/lib/games";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in first.", 401);
  const { id } = await params;
  const result = await archiveGame(id, player.id);
  if (!result.ok) return fail(result.reason ?? "Could not archive that game.", 403);
  return json({ ok: true });
}
