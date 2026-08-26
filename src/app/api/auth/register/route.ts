import {
  createPlayer,
  createSession,
  findPlayerByUsername,
  setSessionCookie,
  validateUsername,
} from "@/lib/auth";
import { fail, json, readJson } from "@/lib/api";

interface Body {
  username: string;
  displayName: string;
  password: string;
  handicapIndex?: number;
  ghin?: string;
}

export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  const username = (body.username ?? "").trim();
  const displayName = (body.displayName ?? "").trim() || username;
  const invalid = validateUsername(username);
  if (invalid) return fail(invalid);
  if (!body.password || body.password.length < 8) {
    return fail("Password must be at least 8 characters.");
  }
  if (await findPlayerByUsername(username)) return fail("That username is taken.", 409);

  const player = await createPlayer({
    username,
    displayName,
    password: body.password,
    handicapIndex: Number.isFinite(body.handicapIndex) ? Number(body.handicapIndex) : 18,
    ghin: body.ghin?.trim() || null,
  });
  const { token, expires } = await createSession(player.id);
  await setSessionCookie(token, expires);
  return json({ player });
}
