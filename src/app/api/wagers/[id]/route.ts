import { currentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/api";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in first.", 401);
  const { id } = await params;
  const result = db().prepare("DELETE FROM wagers WHERE id = ?").run(id);
  if (result.changes === 0) return fail("Wager not found.", 404);
  return json({ ok: true });
}
