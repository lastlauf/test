import { currentPlayer } from "@/lib/auth";
import { fail, json } from "@/lib/api";
import { getGame, joinGame } from "@/lib/games";

const REASONS: Record<string, [string, number]> = {
  "not-found": ["That game no longer exists.", 404],
  "already-in": ["You are already in this game.", 409],
  full: ["This game is full.", 409],
  archived: ["That game has been archived.", 409],
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in to join a game.", 401);
  const { id } = await params;
  const result = await joinGame(id, player.id);
  if (!result.ok) {
    const [message, status] = REASONS[result.reason];
    return fail(message, status);
  }
  return json({ side: result.side, game: await getGame(id) });
}
