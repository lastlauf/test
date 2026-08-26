"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LedgerPayload, WagerDef } from "@/lib/payloads";
import { shortName } from "@/lib/scoring";
import { WAGER_LABEL, type WagerType } from "@/lib/wagers";
import { useLive } from "./useLive";
import { Panel } from "./ui";

interface Props {
  roundId: string;
  roundName: string;
  canEdit: boolean;
  matches: { id: string; name: string; label: string }[];
  players: { id: string; name: string }[];
  wagers: WagerDef[];
  initialLedger: LedgerPayload;
}

const name = (value: string | undefined) => (value ? shortName(value) : "?");

const money = (n: number) =>
  `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2).replace(/\.00$/, "")}`;

export default function Bets({
  roundId,
  roundName,
  canEdit,
  matches,
  players,
  wagers,
  initialLedger,
}: Props) {
  const router = useRouter();
  const { data, online } = useLive<LedgerPayload>(
    `/api/rounds/${roundId}/ledger`,
    initialLedger,
    10000,
  );
  const { ledger } = data;

  const [type, setType] = useState<WagerType>("skins");
  const [amount, setAmount] = useState("5");
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>(players.map((p) => p.id));
  const [mode, setMode] = useState<"net" | "gross">("net");
  const [carryover, setCarryover] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rounds/${roundId}/wagers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          matchId: type === "nassau" ? matchId : null,
          playerIds: type === "nassau" ? [] : selected,
          settings: type === "skins" ? { mode, carryover } : {},
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not add that bet");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that bet");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/wagers/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest tsi-muted">
        {roundName} · {online ? "● Live" : "○ Offline"} · calculation only, no money moves
      </p>

      <Panel>
        <h2 className="mb-3 text-lg font-black">Who owes whom</h2>
        {ledger.settlements.length === 0 ? (
          <p className="font-semibold tsi-muted">Nothing settled yet.</p>
        ) : (
          <ul className="space-y-2">
            {ledger.settlements.map((row, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-bold">
                  {name(ledger.players[row.from])}{" "}
                  <span className="tsi-muted">pays</span> {name(ledger.players[row.to])}
                </span>
                <span className="tsi-num shrink-0 text-lg font-black">
                  {money(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {ledger.balances.length > 0 && (
          <div className="mt-4 border-t-2 pt-3" style={{ borderColor: "var(--tsi-line)" }}>
            <h3 className="mb-2 text-xs font-black uppercase tracking-widest tsi-muted">
              Net position
            </h3>
            <ul className="space-y-1">
              {ledger.balances.map((row) => (
                <li key={row.playerId} className="flex items-center justify-between gap-3">
                  <span className="truncate font-bold">
                    {ledger.players[row.playerId] ?? "?"}
                  </span>
                  <span
                    className="tsi-num shrink-0 font-black"
                    style={{ color: row.amount < 0 ? "var(--color-flag)" : "var(--color-fairway)" }}
                  >
                    {money(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {ledger.results.map((result) => (
        <Panel key={result.wagerId}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <h2 className="text-base font-black">{result.title}</h2>
            {canEdit && (
              <button
                type="button"
                onClick={() => remove(result.wagerId)}
                className="shrink-0 text-xs font-black uppercase tracking-widest"
                style={{ color: "var(--color-flag)" }}
              >
                Remove
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {result.lines.map((line, i) => (
              <li key={i} className="text-sm font-semibold">
                {line}
              </li>
            ))}
          </ul>
          {result.pending && (
            <p className="mt-2 text-xs font-bold uppercase tracking-widest tsi-muted">
              Still running
            </p>
          )}
        </Panel>
      ))}

      {wagers.length === 0 && (
        <Panel>
          <p className="font-semibold tsi-muted">No side bets on this round yet.</p>
        </Panel>
      )}

      {canEdit && (
        <Panel className="space-y-3">
          <h2 className="text-lg font-black">Add a bet</h2>
          <div className="grid grid-cols-3 gap-1 rounded-xl border-2 p-1" style={{ borderColor: "var(--tsi-line)" }}>
            {(["nassau", "skins", "h2h"] as WagerType[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className="tsi-tap rounded-lg text-sm font-black"
                style={{
                  background: type === option ? "var(--color-ink)" : "transparent",
                  color: type === option ? "#fff" : "var(--tsi-text)",
                }}
              >
                {WAGER_LABEL[option]}
              </button>
            ))}
          </div>

          <div>
            <label className="tsi-label" htmlFor="stake">
              {type === "nassau"
                ? "Stake per segment"
                : type === "skins"
                  ? "Per skin, per player"
                  : "Stake"}
            </label>
            <input
              id="stake"
              className="tsi-field tsi-num"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          {type === "nassau" && (
            <div>
              <label className="tsi-label" htmlFor="match">
                Match
              </label>
              <select
                id="match"
                className="tsi-field"
                value={matchId}
                onChange={(event) => setMatchId(event.target.value)}
              >
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type !== "nassau" && (
            <div>
              <span className="tsi-label">
                {type === "h2h" ? "Pick exactly two" : "Players in"}
              </span>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => {
                  const on = selected.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => toggle(player.id)}
                      className="tsi-tap rounded-xl border-2 px-3 text-sm font-black"
                      style={{
                        borderColor: on ? "var(--color-ink)" : "var(--tsi-line)",
                        background: on ? "var(--color-ink)" : "transparent",
                        color: on ? "#fff" : "var(--tsi-text)",
                      }}
                      aria-pressed={on}
                    >
                      {player.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {type === "skins" && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 font-bold">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={mode === "net"}
                  onChange={(event) => setMode(event.target.checked ? "net" : "gross")}
                />
                Net skins
              </label>
              <label className="flex items-center gap-2 font-bold">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={carryover}
                  onChange={(event) => setCarryover(event.target.checked)}
                />
                Ties carry over
              </label>
            </div>
          )}

          {error && (
            <p className="font-bold" style={{ color: "var(--color-flag)" }}>
              {error}
            </p>
          )}

          <button
            type="button"
            className="tsi-btn tsi-btn-primary w-full"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Adding…" : "Add bet"}
          </button>
        </Panel>
      )}
    </div>
  );
}
