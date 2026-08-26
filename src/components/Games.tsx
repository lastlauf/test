"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BET_GUIDES, FORMAT_GUIDES } from "@/lib/game-guides";
import type { GameSummary } from "@/lib/games";
import type { Format } from "@/lib/scoring";
import { Panel } from "./ui";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
    >
      <path d="M6 9.5 12 15l6-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Games({
  games,
  myPlayerId,
}: {
  games: GameSummary[];
  myPlayerId: string | null;
}) {
  const router = useRouter();
  const [openGuide, setOpenGuide] = useState<Format | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (label: string, run: () => Promise<Response>) => {
    setBusy(label);
    setError(null);
    try {
      const response = await run();
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        matchId?: string;
      };
      if (!response.ok) {
        setError(body.error ?? "That didn't work.");
        return null;
      }
      router.refresh();
      return body;
    } catch {
      setError("No connection. Try again when you have signal.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const start = async (format: Format) => {
    const body = await act(`start-${format}`, () =>
      fetch("/api/games", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format }),
      }),
    );
    if (body?.matchId) router.push(`/score/${body.matchId}`);
  };

  const join = async (game: GameSummary) => {
    const body = await act(`join-${game.round.id}`, () =>
      fetch(`/api/games/${game.round.id}/join`, { method: "POST" }),
    );
    if (body) router.push(`/score/${game.matchId}`);
  };

  const archive = async (game: GameSummary) =>
    act(`archive-${game.round.id}`, () =>
      fetch(`/api/games/${game.round.id}/archive`, { method: "POST" }),
    );

  return (
    <div className="tsi-stack">
      {error && (
        <p className="tsi-rule rounded-xl px-4 py-3 text-[15px] font-semibold">{error}</p>
      )}

      {games.length > 0 && (
        <section>
          <h2 className="mb-4">Games in play</h2>
          <div className="tsi-stack-tight">
            {games.map((game) => {
              const mine = myPlayerId && game.players.some((p) => p.id === myPlayerId);
              const isCreator = myPlayerId && game.createdBy === myPlayerId;
              const guide = FORMAT_GUIDES.find((g) => g.format === game.round.format);
              return (
                <Panel key={game.round.id} className="!p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3>{guide?.name ?? game.round.name}</h3>
                    <span className="text-[13px] tsi-muted">
                      {game.players.length} of {game.capacity}
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] tsi-muted">
                    Started by {game.creatorName ?? "someone"}
                    {game.round.played_on ? ` · ${game.round.played_on}` : ""}
                  </p>

                  <ul className="mt-4 space-y-1.5">
                    {game.players.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-[15px]">
                        <span className="tsi-num w-5 text-[13px] tsi-muted">{p.side}</span>
                        <Link href={`/players/${p.username}`} className="font-semibold">
                          {p.displayName}
                        </Link>
                        {p.id === myPlayerId && (
                          <span className="text-[13px] tsi-muted">— you</span>
                        )}
                      </li>
                    ))}
                    {game.players.length === 0 && (
                      <li className="text-[15px] tsi-muted">Nobody has joined yet.</li>
                    )}
                  </ul>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {mine ? (
                      <Link href={`/score/${game.matchId}`} className="tsi-btn tsi-btn-primary flex-1">
                        Open scorecard
                      </Link>
                    ) : game.full ? (
                      <Link href={`/score/${game.matchId}`} className="tsi-btn flex-1">
                        Watch — game is full
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="tsi-btn tsi-btn-primary flex-1"
                        disabled={!myPlayerId || busy === `join-${game.round.id}`}
                        onClick={() => join(game)}
                      >
                        {busy === `join-${game.round.id}` ? "Joining…" : "Join this game"}
                      </button>
                    )}
                    {isCreator && (
                      <button
                        type="button"
                        className="tsi-btn"
                        disabled={busy === `archive-${game.round.id}`}
                        onClick={() => archive(game)}
                      >
                        {busy === `archive-${game.round.id}` ? "Archiving…" : "Archive"}
                      </button>
                    )}
                  </div>
                  {isCreator && (
                    <p className="mt-3 text-[13px] tsi-muted">
                      You started this game, so you can archive it when it is done.
                    </p>
                  )}
                </Panel>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2">Start a game</h2>
        <p className="mb-5 text-[15px] tsi-muted">
          Pick a format and start it. Anyone with an account can join until the sides are
          full, and whoever starts it can archive it afterwards.
        </p>

        <div className="tsi-stack-tight">
          {FORMAT_GUIDES.map((guide) => {
            const open = openGuide === guide.format;
            return (
              <Panel key={guide.format} className="!p-5">
                <h3>{guide.name}</h3>
                <p className="mt-0.5 text-[13px] tsi-muted">{guide.players}</p>
                <p className="mt-3 text-[15px]">{guide.summary}</p>

                <button
                  type="button"
                  className="mt-4 flex items-center gap-1.5 text-[14px] font-semibold"
                  aria-expanded={open}
                  onClick={() => setOpenGuide(open ? null : guide.format)}
                >
                  {open ? "Hide the rules" : "How it works & rules"}
                  <Chevron open={open} />
                </button>

                {open && (
                  <div className="mt-4 tsi-rule-t pt-4">
                    <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] tsi-muted">
                      How a hole is played
                    </h4>
                    <ol className="mt-2 space-y-2">
                      {guide.howItWorks.map((step, i) => (
                        <li key={i} className="flex gap-3 text-[15px]">
                          <span className="tsi-num shrink-0 tsi-muted">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <h4 className="mt-5 text-[13px] font-bold uppercase tracking-[0.08em] tsi-muted">
                      Rules
                    </h4>
                    <ul className="mt-2 space-y-2">
                      {guide.rules.map((rule, i) => (
                        <li key={i} className="flex gap-3 text-[15px]">
                          <span aria-hidden className="shrink-0 tsi-muted">
                            ·
                          </span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  className="tsi-btn tsi-btn-primary mt-5 w-full"
                  disabled={!myPlayerId || busy === `start-${guide.format}`}
                  onClick={() => start(guide.format)}
                >
                  {busy === `start-${guide.format}`
                    ? "Starting…"
                    : `Start a ${guide.name.toLowerCase()} game`}
                </button>
                {!myPlayerId && (
                  <p className="mt-3 text-center text-[14px] tsi-muted">
                    <Link href="/login" className="underline">
                      Sign in
                    </Link>{" "}
                    to start or join a game.
                  </p>
                )}
              </Panel>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2">Side bets</h2>
        <p className="mb-5 text-[15px] tsi-muted">
          Money games that ride on top of whatever format you are playing. Add one from
          the Bets tab once a game is under way.
        </p>
        <Panel className="!p-0">
          <ul>
            {BET_GUIDES.map((bet, i) => (
              <li key={bet.name} className={`px-5 py-5 ${i > 0 ? "tsi-rule-t" : ""}`}>
                <h3>{bet.name}</h3>
                <p className="mt-1.5 text-[15px]">{bet.summary}</p>
                <ul className="mt-3 space-y-1.5">
                  {bet.rules.map((rule, j) => (
                    <li key={j} className="flex gap-3 text-[14px] tsi-muted">
                      <span aria-hidden className="shrink-0">
                        ·
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  );
}
