"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Player } from "@/lib/auth";
import { Avatar } from "./Avatar";
import { Panel } from "./ui";

/** Downscale in the browser so a 4 MB phone photo becomes a ~40 KB avatar. */
async function toAvatarDataUrl(file: File, size = 320): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ProfileEditor({ player }: { player: Player }) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: player.display_name,
    handicapIndex: String(player.handicap_index),
    ghin: player.ghin ?? "",
    memberSince: player.member_since ? String(player.member_since) : "",
    bio: player.bio ?? "",
  });
  const [photo, setPhoto] = useState<string | null>(player.photo);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const pickPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setPhoto(await toAvatarDataUrl(file));
      setStatus("Photo ready — press Save");
    } catch {
      setError("Could not read that image.");
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        handicapIndex: Number(form.handicapIndex),
        ghin: form.ghin,
        memberSince: form.memberSince ? Number(form.memberSince) : null,
        bio: form.bio,
        photo,
      }),
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? "Could not save");
      return;
    }
    setStatus("Saved");
    router.refresh();
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Panel className="space-y-4">
        <form onSubmit={save} className="space-y-3">
          <div className="flex items-center gap-4">
            <Avatar name={form.displayName} photo={photo} size={72} />
            <label className="tsi-btn cursor-pointer text-sm">
              Change photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={pickPhoto}
              />
            </label>
            {photo && (
              <button
                type="button"
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: "var(--color-flag)" }}
                onClick={() => setPhoto(null)}
              >
                Remove
              </button>
            )}
          </div>

          <div>
            <label className="tsi-label" htmlFor="name">
              Name
            </label>
            <input id="name" className="tsi-field" value={form.displayName} onChange={set("displayName")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="tsi-label" htmlFor="hcp">
                Handicap index
              </label>
              <input
                id="hcp"
                className="tsi-field tsi-num"
                inputMode="decimal"
                value={form.handicapIndex}
                onChange={set("handicapIndex")}
              />
            </div>
            <div>
              <label className="tsi-label" htmlFor="ghin-edit">
                GHIN
              </label>
              <input
                id="ghin-edit"
                className="tsi-field tsi-num"
                inputMode="numeric"
                value={form.ghin}
                onChange={set("ghin")}
              />
            </div>
          </div>

          <div>
            <label className="tsi-label" htmlFor="since">
              First TSI year
            </label>
            <input
              id="since"
              className="tsi-field tsi-num"
              inputMode="numeric"
              value={form.memberSince}
              onChange={set("memberSince")}
            />
          </div>

          <div>
            <label className="tsi-label" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              className="tsi-field py-3"
              rows={3}
              style={{ minHeight: 90 }}
              value={form.bio}
              onChange={set("bio")}
            />
          </div>

          {error && (
            <p className="font-bold" style={{ color: "var(--color-flag)" }}>
              {error}
            </p>
          )}
          {status && <p className="font-bold">{status}</p>}

          <button type="submit" className="tsi-btn tsi-btn-primary w-full" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </Panel>

      <button type="button" className="tsi-btn tsi-btn-danger w-full" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
