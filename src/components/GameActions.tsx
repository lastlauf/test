"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmAction } from "./Confirm";

/**
 * The two irreversible things only a game's creator can do. Both ask first:
 * archiving is recoverable, deleting is not, and the wording says which.
 */
export default function GameActions({ roundId }: { roundId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const call = async (path: string, method: string, after: () => void) => {
    setError(null);
    try {
      const response = await fetch(path, { method });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "That didn't work.");
        return;
      }
      after();
    } catch {
      setError("No connection. Try again when you have signal.");
    }
  };

  return (
    <section>
      <h2 className="mb-2">Finish up</h2>
      <p className="mb-5 text-[15px] tsi-muted">
        You started this game, so these are yours to do.
      </p>
      <div className="tsi-stack-tight">
        <ConfirmAction
          className="w-full"
          label="Archive this game"
          question="Archive this game? It stops accepting scores and moves to the archive, where you can still open the scorecard."
          confirmLabel="Yes, archive it"
          busyLabel="Archiving…"
          onConfirm={() =>
            call(`/api/games/${roundId}/archive`, "POST", () => {
              router.push("/archive");
              router.refresh();
            })
          }
        />
        <ConfirmAction
          className="w-full"
          tone="danger"
          label="Delete this game"
          question="Delete this game for good? The scores, the players and every bet on it go with it. This cannot be undone."
          confirmLabel="Yes, delete it"
          busyLabel="Deleting…"
          onConfirm={() =>
            call(`/api/games/${roundId}`, "DELETE", () => {
              router.push("/games");
              router.refresh();
            })
          }
        />
      </div>
      {error && (
        <p className="mt-4 text-[15px] font-semibold" style={{ color: "var(--color-flag)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
