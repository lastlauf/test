import {
  createSession,
  findPlayerByUsername,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { fail, json, readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ username: string; password: string }>(request);
  const player = await findPlayerByUsername((body.username ?? "").trim());
  if (!player || !verifyPassword(body.password ?? "", player.password_hash)) {
    return fail("Wrong username or password.", 401);
  }
  const { token, expires } = await createSession(player.id);
  await setSessionCookie(token, expires);
  const { password_hash: _ignored, ...safe } = player;
  return json({ player: safe });
}
