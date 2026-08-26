import {
  createPlayer,
  createSession,
  findPlayerByEmail,
  setSessionCookie,
  uniqueUsername,
  validateEmail,
} from "@/lib/auth";
import { fail, json, readJson } from "@/lib/api";

interface Body {
  displayName: string;
  email: string;
  password: string;
  handicapIndex?: number;
}

export async function POST(request: Request) {
  const body = await readJson<Body>(request);
  const displayName = (body.displayName ?? "").trim();
  const email = (body.email ?? "").trim();

  if (displayName.length < 2) return fail("Tell us your name.");
  const badEmail = validateEmail(email);
  if (badEmail) return fail(badEmail);
  if (!body.password || body.password.length < 8) {
    return fail("Password must be at least 8 characters.");
  }
  if (await findPlayerByEmail(email)) {
    return fail("There is already an account on that email — sign in instead.", 409);
  }

  let player;
  try {
    player = await createPlayer({
      // The username is the profile's public handle; derive it so signing up
      // only ever asks for a name, an email and a password.
      username: await uniqueUsername(email),
      displayName,
      email,
      password: body.password,
      handicapIndex: Number.isFinite(body.handicapIndex) ? Number(body.handicapIndex) : 18,
    });
  } catch (error) {
    // Two people can clear the duplicate check at the same moment; the unique
    // index is what actually decides it.
    if ((error as { code?: string }).code === "23505") {
      return fail("There is already an account on that email — sign in instead.", 409);
    }
    throw error;
  }
  const { token, expires } = await createSession(player.id);
  await setSessionCookie(token, expires);
  return json({ player });
}
