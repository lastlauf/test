import {
  createSession,
  findPlayerByLogin,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { fail, json, readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ identifier?: string; username?: string; password: string }>(
    request,
  );
  const identifier = (body.identifier ?? body.username ?? "").trim();
  const player = identifier ? await findPlayerByLogin(identifier) : null;
  if (!player || !verifyPassword(body.password ?? "", player.password_hash)) {
    return fail("That email or password isn't right.", 401);
  }
  const { token, expires } = await createSession(player.id);
  await setSessionCookie(token, expires);
  const { password_hash: _ignored, ...safe } = player;
  return json({ player: safe });
}
