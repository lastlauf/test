import { currentPlayer } from "@/lib/auth";
import { db, uid } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { getRound, listMatchViews, listWagers } from "@/lib/tsi";
import type { WagerType } from "@/lib/wagers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!getRound(id)) return fail("Round not found.", 404);
  return json({ wagers: listWagers(id) });
}

interface Body {
  type: WagerType;
  amount: number;
  matchId?: string | null;
  playerIds?: string[];
  settings?: Record<string, unknown>;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in to add a wager.", 401);
  const { id } = await params;
  const round = getRound(id);
  if (!round) return fail("Round not found.", 404);

  const body = await readJson<Body>(request);
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return fail("Enter a stake above zero.");
  if (!["nassau", "skins", "h2h"].includes(body.type)) return fail("Unknown wager type.");

  const matches = listMatchViews(round.id);
  const playerIds = [...new Set(body.playerIds ?? [])];

  if (body.type === "nassau") {
    if (!body.matchId || !matches.some((m) => m.id === body.matchId)) {
      return fail("Pick the match this Nassau is played in.");
    }
  }
  if (body.type === "skins" && playerIds.length < 2) {
    return fail("Skins needs at least two players.");
  }
  if (body.type === "h2h" && playerIds.length !== 2) {
    return fail("Head-to-head needs exactly two players.");
  }

  const wagerId = uid("wgr");
  const insert = db().transaction(() => {
    db()
      .prepare(
        "INSERT INTO wagers (id, round_id, match_id, type, amount, settings) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        wagerId,
        round.id,
        body.type === "nassau" ? body.matchId : null,
        body.type,
        amount,
        JSON.stringify(body.settings ?? {}),
      );
    const link = db().prepare(
      "INSERT OR IGNORE INTO wager_players (wager_id, player_id) VALUES (?, ?)",
    );
    for (const pid of playerIds) link.run(wagerId, pid);
  });
  insert();

  return json({ wagers: listWagers(round.id) }, 201);
}
