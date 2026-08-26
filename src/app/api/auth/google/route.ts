import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appOrigin, googleEnabled } from "@/lib/auth";
import { fail } from "@/lib/api";

export const OAUTH_STATE_COOKIE = "tsi_oauth_state";

export async function GET() {
  if (!googleEnabled()) {
    return fail("Google sign-in is not configured on this deployment.", 501);
  }
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${appOrigin()}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
