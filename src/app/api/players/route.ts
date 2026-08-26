import { listPlayers } from "@/lib/auth";
import { json } from "@/lib/api";

export async function GET() {
  return json({ players: listPlayers() });
}
