"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MatchPayload } from "@/lib/payloads";
import {
  type Hole,
  type ScoreRow,
  matchState,
  sideName,
  strokesOnHole,
  subjectsForSide,
  writableSubject,
} from "@/lib/scoring";
import { Panel } from "./ui";
import { useOnline } from "./useLive";
import { Scroller } from "@/components/Scroller";

interface Draft {
  gross: number | null;
  putts: number | null;
}

/** Drafts are keyed by hole: a player only ever edits one score per hole. */
type DraftMap = Record<string, Draft>;

const key = (hole: number, type: string, id: string) => `${hole}|${type}|${id}`;

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function loadLocal<T>(name: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(name);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(name: string, value: unknown) {
  try {
    window.localStorage.setItem(name, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the round still plays, we just can't cache */
  }
}

/** Strokes received, shown as dots beside a name. */
function StrokeDots({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-1.5 align-middle text-[11px]"
      style={{ color: "var(--color-flag)" }}
      title={`${count} stroke${count === 1 ? "" : "s"} on this hole`}
    >
      {"•".repeat(Math.min(count, 4))}
    </span>
  );
}

export default function ScoreEntry({
  initial,
  myPlayerId,
  signedIn,
}: {
  initial: MatchPayload;
  myPlayerId: string | null;
  signedIn: boolean;
}) {
  const [payload, setPayload] = useState(initial);
  const { match, holes } = payload;
  const online = useOnline();

  // The one score this account is allowed to touch.
  const mine = useMemo(
    () => writableSubject(match.sides, match.format, myPlayerId),
    [match.sides, match.format, myPlayerId],
  );

  const draftKey = `tsi.draft.${match.id}`;
  const queueKey = `tsi.queue.${match.id}`;

  const [drafts, setDrafts] = useState<DraftMap>({});
  const [queued, setQueued] = useState<string[]>([]);
  const [hole, setHole] = useState(() => Math.min(18, Math.max(1, match.state.thru + 1)));
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const flushing = useRef(false);

  useEffect(() => {
    setDrafts(loadLocal<DraftMap>(draftKey, {}));
    setQueued(loadLocal<string[]>(queueKey, []));
  }, [draftKey, queueKey]);

  const serverScores = useMemo(() => {
    const map = new Map<string, ScoreRow>();
    for (const row of match.scores) map.set(key(row.hole, row.subjectType, row.subjectId), row);
    return map;
  }, [match.scores]);

  const valueFor = useCallback(
    (holeNumber: number, type: string, id: string): Draft => {
      const k = key(holeNumber, type, id);
      if (drafts[k]) return drafts[k];
      const row = serverScores.get(k);
      return { gross: row?.gross ?? null, putts: row?.putts ?? null };
    },
    [drafts, serverScores],
  );

  /** Match state including anything typed but not yet synced. */
  const localState = useMemo(() => {
    const merged: ScoreRow[] = [...match.scores];
    const seen = new Set(merged.map((r) => key(r.hole, r.subjectType, r.subjectId)));
    for (const [k, draft] of Object.entries(drafts)) {
      const [holeStr, type, id] = k.split("|");
      const row: ScoreRow = {
        hole: Number(holeStr),
        subjectType: type as "player" | "side",
        subjectId: id,
        gross: draft.gross,
        putts: draft.putts,
      };
      if (seen.has(k)) {
        merged[merged.findIndex((r) => key(r.hole, r.subjectType, r.subjectId) === k)] = row;
      } else {
        merged.push(row);
      }
    }
    return matchState(holes, match.sides, merged, match.format, match.allowance);
  }, [drafts, holes, match.scores, match.sides, match.format, match.allowance]);

  const setValue = (field: keyof Draft, next: number | null) => {
    if (!mine) return;
    setDrafts((prev) => {
      const k = key(hole, mine.type, mine.id);
      const current = prev[k] ?? valueFor(hole, mine.type, mine.id);
      const updated = { ...prev, [k]: { ...current, [field]: next } };
      saveLocal(draftKey, updated);
      return updated;
    });
  };

  const flush = useCallback(
    async (holeNumbers: number[], drafted: DraftMap) => {
      if (!mine) return true;
      const rows = holeNumbers
        .map((holeNumber) => {
          const draft = drafted[key(holeNumber, mine.type, mine.id)];
          if (!draft) return null;
          return {
            hole: holeNumber,
            subjectType: mine.type,
            subjectId: mine.id,
            gross: draft.gross,
            putts: draft.putts,
          };
        })
        .filter(Boolean);
      if (!rows.length) return true;
      const response = await fetch(`/api/matches/${match.id}/scores`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scores: rows }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not save");
      }
      const body = (await response.json()) as { match: MatchPayload["match"] };
      setPayload((prev) => ({ ...prev, match: body.match }));
      return true;
    },
    [match.id, mine],
  );

  const saveHole = async () => {
    if (!mine) return;
    setSaving(true);
    setStatus(null);
    try {
      await flush([hole], drafts);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key(hole, mine.type, mine.id)];
        saveLocal(draftKey, next);
        return next;
      });
      setQueued((prev) => {
        const next = prev.filter((h) => Number(h) !== hole);
        saveLocal(queueKey, next);
        return next;
      });
      setStatus(`Hole ${hole} saved`);
      if (hole < holes.length) setHole(hole + 1);
    } catch {
      setQueued((prev) => {
        const next = [...new Set([...prev, String(hole)])];
        saveLocal(queueKey, next);
        return next;
      });
      setStatus(`Saved on this phone — hole ${hole} syncs when you have signal`);
      if (hole < holes.length) setHole(hole + 1);
    } finally {
      setSaving(false);
    }
  };

  // Push anything queued as soon as the phone finds signal again.
  useEffect(() => {
    if (!online || !queued.length || flushing.current || !mine) return;
    flushing.current = true;
    (async () => {
      try {
        await flush(queued.map(Number), drafts);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const holeNumber of queued) delete next[key(Number(holeNumber), mine.type, mine.id)];
          saveLocal(draftKey, next);
          return next;
        });
        setQueued(() => {
          saveLocal(queueKey, []);
          return [];
        });
        setStatus("Offline holes synced");
      } catch {
        /* still no luck — keep the queue for the next attempt */
      } finally {
        flushing.current = false;
      }
    })();
  }, [online, queued, drafts, flush, mine, draftKey, queueKey]);

  const current: Hole | undefined = holes.find((h) => h.number === hole);
  const holeResult = localState.results.find((r) => r.hole === hole);

  // Everyone in the match except the score this account owns.
  const others = useMemo(
    () =>
      match.sides.flatMap((side) =>
        subjectsForSide(side, match.format)
          .filter((subject) => !(mine && subject.id === mine.id))
          .map((subject) => ({ ...subject, teamColor: side.teamColor })),
      ),
    [match.sides, match.format, mine],
  );

  const myValue = mine ? valueFor(hole, mine.type, mine.id) : null;
  const myStrokes =
    mine && current ? strokesOnHole(localState.strokes[mine.id] ?? 0, current.strokeIndex) : 0;
  const myNet = myValue?.gross != null ? myValue.gross - myStrokes : null;

  return (
    <div className="tsi-stack-tight">
      <Panel className="!py-3">
        <p className="truncate text-[15px] font-semibold">
          {sideName(match.sides[0])} <span className="tsi-muted">v</span>{" "}
          {sideName(match.sides[1])}
        </p>
        <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[13px]">
          <span className="tsi-muted">{titleCase(match.format)}</span>
          <span className="font-semibold">{localState.status}</span>
        </div>
      </Panel>

      {/* Hole picker */}
      <div className="tsi-panel flex items-center justify-between px-2 py-3">
        <button
          type="button"
          className="tsi-tap rounded-xl text-2xl"
          onClick={() => setHole((h) => Math.max(1, h - 1))}
          aria-label="Previous hole"
          style={{ color: hole === 1 ? "var(--tsi-line)" : "var(--tsi-text)" }}
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-[12px] tsi-muted">Hole</p>
          <p className="tsi-num text-[38px] font-extrabold leading-none">{hole}</p>
          <p className="mt-1 text-[13px] tsi-muted">
            Par {current?.par ?? "–"} · SI {current?.strokeIndex ?? "–"}
            {current?.yardage ? ` · ${current.yardage} yds` : ""}
          </p>
        </div>
        <button
          type="button"
          className="tsi-tap rounded-xl text-2xl"
          onClick={() => setHole((h) => Math.min(holes.length, h + 1))}
          aria-label="Next hole"
          style={{ color: hole === holes.length ? "var(--tsi-line)" : "var(--tsi-text)" }}
        >
          ›
        </button>
      </div>

      <Scroller className="-mx-1" innerClassName="px-1">
        <div className="flex gap-1 pb-1">
          {holes.map((h) => {
            const done = localState.results.find((r) => r.hole === h.number)?.winner != null;
            const active = h.number === hole;
            return (
              <button
                key={h.number}
                type="button"
                onClick={() => setHole(h.number)}
                className="tsi-num h-9 w-9 shrink-0 rounded-full text-[14px]"
                style={{
                  background: active ? "var(--tsi-text)" : done ? "var(--tsi-fill)" : "transparent",
                  color: active ? "var(--tsi-shell)" : done ? "var(--tsi-text)" : "var(--tsi-muted)",
                  fontWeight: active || done ? 700 : 500,
                }}
                aria-label={`Go to hole ${h.number}`}
              >
                {h.number}
              </button>
            );
          })}
        </div>
      </Scroller>

      {/* Your score — the one thing on this screen you can change */}
      {mine && myValue && (
        <Panel className="!px-4 !py-5 text-center">
          <p className="text-[12px] tsi-muted">Your score</p>
          <p className="mt-0.5 text-[15px] font-semibold">
            {mine.label}
            <StrokeDots count={myStrokes} />
          </p>

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Score down"
              onClick={() => setValue("gross", Math.max(1, (myValue.gross ?? 5) - 1))}
              className="tsi-rule grid place-items-center rounded-2xl text-3xl"
              style={{ width: 64, height: 64 }}
            >
              −
            </button>
            <span
              className="tsi-num grid place-items-center font-extrabold"
              style={{
                minWidth: 84,
                fontSize: 64,
                lineHeight: 1,
                color: myValue.gross == null ? "var(--tsi-line)" : "var(--tsi-text)",
              }}
              aria-live="polite"
            >
              {myValue.gross ?? "–"}
            </span>
            <button
              type="button"
              aria-label="Score up"
              onClick={() => setValue("gross", Math.min(20, (myValue.gross ?? 3) + 1))}
              className="tsi-rule grid place-items-center rounded-2xl text-3xl"
              style={{ width: 64, height: 64 }}
            >
              +
            </button>
          </div>

          <p className="mt-2 text-[13px] tsi-muted">
            {myNet != null
              ? `Net ${myNet}${current ? ` · ${myNet - current.par === 0 ? "par" : myNet - current.par > 0 ? `+${myNet - current.par}` : myNet - current.par}` : ""}`
              : "Tap + or − to post this hole"}
          </p>

          <div
            className="mt-4 flex items-center justify-center gap-3 pt-4"
            style={{ borderTop: "var(--tsi-rule) solid var(--tsi-line)" }}
          >
            <span className="text-[13px] tsi-muted">Putts</span>
            <button
              type="button"
              aria-label="Putts down"
              onClick={() => setValue("putts", Math.max(0, (myValue.putts ?? 2) - 1))}
              className="tsi-rule grid place-items-center rounded-xl text-xl"
              style={{ width: 48, height: 48 }}
            >
              −
            </button>
            <span className="tsi-num text-[22px] font-bold" style={{ minWidth: 28 }}>
              {myValue.putts ?? "–"}
            </span>
            <button
              type="button"
              aria-label="Putts up"
              onClick={() => setValue("putts", Math.min(9, (myValue.putts ?? 1) + 1))}
              className="tsi-rule grid place-items-center rounded-xl text-xl"
              style={{ width: 48, height: 48 }}
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="tsi-btn tsi-btn-primary mt-4 w-full"
            onClick={saveHole}
            disabled={saving}
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : `Save hole ${hole}`}
          </button>

          <p className="mt-2 text-[13px] tsi-muted" aria-live="polite">
            {!online
              ? "Offline — kept on this phone until you have signal"
              : queued.length > 0
                ? `${queued.length} hole${queued.length === 1 ? "" : "s"} waiting to sync`
                : status}
          </p>
        </Panel>
      )}

      {!mine && (
        <Panel className="text-center">
          <p className="text-[15px] font-semibold">
            {signedIn ? "You are not playing in this match" : "You are not signed in"}
          </p>
          <p className="mt-1 text-[14px] tsi-muted">
            {signedIn ? (
              "You can follow the scores here, but only the players in a match can post to it."
            ) : (
              <>
                <Link href="/login" className="underline">
                  Sign in
                </Link>{" "}
                to post your own scores.
              </>
            )}
          </p>
        </Panel>
      )}

      {/* Everyone else — visible, never editable */}
      {others.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold tsi-muted">
              {mine ? "Rest of the group" : "The group"}
            </h2>
            <span className="text-[12px] tsi-muted">Hole {hole} · view only</span>
          </div>
          <div className="rounded-[14px]" style={{ background: "var(--tsi-fill)" }}>
            <ul>
              {others.map((subject, i) => {
                const value = valueFor(hole, subject.type, subject.id);
                const strokes = current
                  ? strokesOnHole(localState.strokes[subject.id] ?? 0, current.strokeIndex)
                  : 0;
                const net = value.gross != null ? value.gross - strokes : null;
                return (
                  <li
                    key={`${subject.type}:${subject.id}`}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "tsi-rule-t" : ""}`}
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: subject.teamColor ?? "var(--tsi-muted)" }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px]">
                      {subject.label}
                      <StrokeDots count={strokes} />
                    </span>
                    <span className="tsi-num w-8 text-right text-[17px] font-semibold">
                      {value.gross ?? "–"}
                    </span>
                    <span className="tsi-num w-14 text-right text-[13px] tsi-muted">
                      {net != null ? `net ${net}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {mine && (
            <p className="mt-2 text-[13px] tsi-muted">
              Everyone posts their own card — you can see theirs, only they can change it.
            </p>
          )}
        </section>
      )}

      {holeResult?.winner && (
        <p className="text-center text-[13px] font-semibold">
          Hole {hole}:{" "}
          {holeResult.winner === "halved"
            ? "halved"
            : `${sideName(match.sides.find((s) => s.id === holeResult.winner))} wins it`}
        </p>
      )}

      <MiniCard payload={{ ...payload, match }} localState={localState} />
    </div>
  );
}

function MiniCard({
  payload,
  localState,
}: {
  payload: MatchPayload;
  localState: ReturnType<typeof matchState>;
}) {
  const { match, holes } = payload;
  const subjects = match.sides.flatMap((side) =>
    subjectsForSide(side, match.format).map((s) => ({ ...s, sideId: side.id })),
  );
  const lookup = new Map(
    match.scores.map((row) => [key(row.hole, row.subjectType, row.subjectId), row]),
  );

  return (
    <Panel className="!p-0">
      <h2 className="tsi-rule-b px-5 py-3.5 text-[16px] font-bold">Card</h2>
      <Scroller className="tsi-on-panel">
        <table className="w-full min-w-[640px] border-collapse text-center">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 px-2 py-1 text-left text-[12px] tsi-muted"
                style={{ background: "var(--tsi-shell)" }}
              >
                Hole
              </th>
              {holes.map((h) => (
                <th key={h.number} className="tsi-num px-1 py-1 text-[12px] tsi-muted">
                  {h.number}
                </th>
              ))}
              <th className="tsi-num px-2 py-1 text-[12px] tsi-muted">Tot</th>
            </tr>
            <tr>
              <th
                className="sticky left-0 z-10 px-2 py-1 text-left text-[12px] tsi-muted"
                style={{ background: "var(--tsi-shell)" }}
              >
                Par
              </th>
              {holes.map((h) => (
                <td key={h.number} className="tsi-num px-1 py-1 text-[12px] tsi-muted">
                  {h.par}
                </td>
              ))}
              <td className="tsi-num px-2 py-1 text-[12px] tsi-muted">
                {holes.reduce((sum, h) => sum + h.par, 0)}
              </td>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => {
              let total = 0;
              return (
                <tr key={`${subject.type}:${subject.id}`} className="tsi-rule-t">
                  <th
                    className="sticky left-0 z-10 max-w-[7rem] truncate px-2 py-1.5 text-left text-[13px] font-semibold"
                    style={{ background: "var(--tsi-shell)" }}
                  >
                    {subject.label}
                  </th>
                  {holes.map((h) => {
                    const row = lookup.get(key(h.number, subject.type, subject.id));
                    if (row?.gross != null) total += row.gross;
                    return (
                      <td key={h.number} className="tsi-num px-1 py-1.5 text-[14px]">
                        {row?.gross ?? "·"}
                      </td>
                    );
                  })}
                  <td className="tsi-num px-2 py-1.5 text-[14px] font-bold">{total || "·"}</td>
                </tr>
              );
            })}
            <tr className="tsi-rule-t">
              <th
                className="sticky left-0 z-10 px-2 py-1.5 text-left text-[13px] tsi-muted"
                style={{ background: "var(--tsi-shell)" }}
              >
                Match
              </th>
              {holes.map((h) => {
                const result = localState.results.find((r) => r.hole === h.number);
                const running = result?.winner ? result.running : null;
                return (
                  <td key={h.number} className="tsi-num px-1 py-1.5 text-[12px] tsi-muted">
                    {running == null ? "·" : running === 0 ? "AS" : running > 0 ? `${running}▲` : `${-running}▼`}
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-[12px] tsi-muted">
                {localState.differential === 0 ? "AS" : Math.abs(localState.differential)}
              </td>
            </tr>
          </tbody>
        </table>
      </Scroller>
    </Panel>
  );
}
