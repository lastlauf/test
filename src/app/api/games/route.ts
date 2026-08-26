import { currentPlayer } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/api";
import { createGame, listOpenGames } from "@/lib/games";
import type { Format } from "@/lib/scoring";

export async function GET() {
  return json({ games: await listOpenGames() });
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in to start a game.", 401);
  const body = await readJson<{ format: Format; courseId?: string }>(request);
  if (!["fourball", "foursome", "singles"].includes(body.format)) {
    return fail("Pick fourball, foursomes or singles.");
  }
  const game = await createGame(player.id, body.format, body.courseId ?? null);
  return json(game, 201);
}
