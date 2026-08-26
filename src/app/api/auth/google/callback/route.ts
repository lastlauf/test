import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  appOrigin,
  createPlayer,
  createSession,
  getPlayer,
  googleEnabled,
  setSessionCookie,
} from "@/lib/auth";
import { fail } from "@/lib/api";
import { OAUTH_STATE_COOKIE } from "../route";

interface GoogleClaims {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

function decodeIdToken(idToken: string): GoogleClaims | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleClaims;
  } catch {
    return null;
  }
}

/** Turn an email or display name into a free TSI username. */
async function pickUsername(seed: string): Promise<string> {
  const base = seed.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 20) || "golfer";
  let candidate = base.length >= 3 ? base : `${base}tsi`;
  let n = 1;
  while (
    await db().one("SELECT 1 FROM players WHERE lower(username) = lower(?)", [candidate])
  ) {
    candidate = `${base}${n++}`;
  }
  return candidate;
}

export async function GET(request: Request) {
  if (!googleEnabled()) return fail("Google sign-in is not configured.", 501);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);
  if (!code || !state || state !== expected) return fail("Sign-in was interrupted.", 400);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appOrigin()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) return fail("Google rejected the sign-in.", 401);
  const tokens = (await response.json()) as { id_token?: string };
  const claims = tokens.id_token ? decodeIdToken(tokens.id_token) : null;
  if (!claims?.sub) return fail("Google did not return an account.", 401);

  const existing = await db().one<{ id: string }>(
    "SELECT id FROM players WHERE google_sub = ?",
    [claims.sub],
  );
  let playerId = existing?.id;
  if (!playerId && claims.email) {
    const byEmail = await db().one<{ id: string }>(
      "SELECT id FROM players WHERE email = ?",
      [claims.email],
    );
    if (byEmail) {
      await db().run("UPDATE players SET google_sub = ? WHERE id = ?", [
        claims.sub,
        byEmail.id,
      ]);
      playerId = byEmail.id;
    }
  }
  if (!playerId) {
    const player = await createPlayer({
      username: await pickUsername(claims.email ?? claims.name ?? "golfer"),
      displayName: claims.name ?? claims.email ?? "New Player",
      email: claims.email ?? null,
      googleSub: claims.sub,
    });
    if (claims.picture) {
      await db().run("UPDATE players SET photo = ? WHERE id = ?", [
        claims.picture,
        player.id,
      ]);
    }
    playerId = player.id;
  }

  const player = await getPlayer(playerId);
  if (!player) return fail("Could not open that account.", 500);
  const { token, expires } = await createSession(player.id);
  await setSessionCookie(token, expires);
  return NextResponse.redirect(`${appOrigin()}/`);
}
