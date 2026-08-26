import { currentPlayer, getPlayer, googleEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";

const MAX_PHOTO_BYTES = 700_000;

export async function GET() {
  return json({ player: await currentPlayer(), googleEnabled: googleEnabled() });
}

interface Patch {
  displayName?: string;
  handicapIndex?: number;
  ghin?: string | null;
  bio?: string | null;
  memberSince?: number | null;
  photo?: string | null;
}

export async function PATCH(request: Request) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in first.", 401);
  const body = await readJson<Patch>(request);

  if (body.photo && body.photo.length > MAX_PHOTO_BYTES) {
    return fail("That photo is too large — please pick one under about 500 KB.", 413);
  }
  // SVG is excluded deliberately: it can carry markup, and every photo the app
  // produces is a canvas-encoded JPEG anyway.
  if (body.photo && !/^(data:image\/(png|jpeg|webp);|https?:\/\/)/.test(body.photo)) {
    return fail("Photo must be a PNG, JPEG or WebP image.", 400);
  }
  if (body.handicapIndex != null && !Number.isFinite(body.handicapIndex)) {
    return fail("Handicap index must be a number.");
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };
  if (body.displayName?.trim()) set("display_name", body.displayName.trim());
  if (body.handicapIndex != null) set("handicap_index", Number(body.handicapIndex));
  if (body.ghin !== undefined) set("ghin", body.ghin?.trim() || null);
  if (body.bio !== undefined) set("bio", body.bio?.trim() || null);
  if (body.memberSince !== undefined) {
    set("member_since", body.memberSince ? Number(body.memberSince) : null);
  }
  if (body.photo !== undefined) set("photo", body.photo || null);
  if (!fields.length) return json({ player });

  values.push(player.id);
  await db().run(`UPDATE players SET ${fields.join(", ")} WHERE id = ?`, values);
  return json({ player: await getPlayer(player.id) });
}
