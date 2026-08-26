import { currentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/api";
import { getGame } from "@/lib/games";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) return fail("That game no longer exists.", 404);
  return json({ game });
}

/**
 * Deleting a game removes it and everything hanging off it — scores, sides,
 * bets — through the foreign keys. Only the player who started it can.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in first.", 401);
  const { id } = await params;
  const game = await getGame(id);
  if (!game) return fail("That game no longer exists.", 404);
  if (game.createdBy !== player.id) {
    return fail("Only the player who started a game can delete it.", 403);
  }
  await db().run("DELETE FROM rounds WHERE id = ?", [id]);
  return json({ ok: true });
}
