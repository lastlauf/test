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
} from "@/lib/scoring";
import { Panel } from "./ui";
import { useOnline } from "./useLive";

interface Draft {
  gross: number | null;
  putts: number | null;
}

type DraftMap = Record<string, Draft>; // key: `${hole}|${type}|${id}`

const key = (hole: number, type: string, id: string) => `${hole}|${type}|${id}`;

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

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  tone = "big",
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  min: number;
  max: number;
  tone?: "big" | "small";
}) {
  const big = tone === "big";
  const step = (delta: number) => {
    const base = value ?? (big ? 4 : 2);
    const next = value == null ? base : base + delta;
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`${label} down`}
        onClick={() => step(-1)}
        className="tsi-tap rounded-xl border-2 text-2xl font-black"
        style={{ borderColor: "var(--tsi-line)", width: big ? 52 : 44, height: big ? 52 : 44 }}
      >
        −
      </button>
      <span
        className="tsi-num grid place-items-center font-black"
        style={{
          width: big ? 56 : 40,
          fontSize: big ? 30 : 20,
          color: value == null ? "var(--tsi-muted)" : "var(--tsi-text)",
        }}
        aria-live="polite"
      >
        {value ?? "–"}
      </span>
      <button
        type="button"
        aria-label={`${label} up`}
        onClick={() => step(1)}
        className="tsi-tap rounded-xl border-2 text-2xl font-black"
        style={{ borderColor: "var(--tsi-line)", width: big ? 52 : 44, height: big ? 52 : 44 }}
      >
        +
      </button>
    </div>
  );
}

export default function ScoreEntry({
  initial,
  canEdit,
}: {
  initial: MatchPayload;
  canEdit: boolean;
}) {
  const [payload, setPayload] = useState(initial);
  const { match, holes } = payload;
  const online = useOnline();

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

  const subjects = useMemo(
    () =>
      match.sides.flatMap((side) =>
        subjectsForSide(side, match.format).map((subject) => ({
          ...subject,
          sideId: side.id,
          teamName: side.teamName,
          teamColor: side.teamColor,
        })),
      ),
    [match.sides, match.format],
  );

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
        const index = merged.findIndex(
          (r) => key(r.hole, r.subjectType, r.subjectId) === k,
        );
        merged[index] = row;
      } else {
        merged.push(row);
      }
    }
    return matchState(holes, match.sides, merged, match.format, match.allowance);
  }, [drafts, holes, match.scores, match.sides, match.format, match.allowance]);

  const setValue = (type: string, id: string, field: keyof Draft, next: number | null) => {
    setDrafts((prev) => {
      const k = key(hole, type, id);
      const current = prev[k] ?? valueFor(hole, type, id);
      const updated = { ...prev, [k]: { ...current, [field]: next } };
      saveLocal(draftKey, updated);
      return updated;
    });
  };

  const flush = useCallback(
    async (holeNumbers: number[], drafted: DraftMap) => {
      const rows = holeNumbers.flatMap((holeNumber) =>
        subjects
          .map((subject) => {
            const k = key(holeNumber, subject.type, subject.id);
            const draft = drafted[k];
            if (!draft) return null;
            return {
              hole: holeNumber,
              subjectType: subject.type,
              subjectId: subject.id,
              gross: draft.gross,
              putts: draft.putts,
            };
          })
          .filter(Boolean),
      );
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
    [match.id, subjects],
  );

  const saveHole = async () => {
    const holeNumbers = [hole];
    setSaving(true);
    setStatus(null);
    try {
      await flush(holeNumbers, drafts);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const subject of subjects) delete next[key(hole, subject.type, subject.id)];
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
      setStatus(`Saved on this phone — hole ${hole} will sync when you have signal`);
      if (hole < holes.length) setHole(hole + 1);
    } finally {
      setSaving(false);
    }
  };

  // Push anything queued as soon as the phone finds signal again.
  useEffect(() => {
    if (!online || !queued.length || flushing.current || !canEdit) return;
    flushing.current = true;
    (async () => {
      try {
        await flush(queued.map(Number), drafts);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const holeNumber of queued) {
            for (const subject of subjects) {
              delete next[key(Number(holeNumber), subject.type, subject.id)];
            }
          }
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
  }, [online, queued, drafts, flush, subjects, draftKey, queueKey, canEdit]);

  const current: Hole | undefined = holes.find((h) => h.number === hole);
  const holeResult = localState.results.find((r) => r.hole === hole);
  const unsaved = subjects.some((s) => drafts[key(hole, s.type, s.id)] != null);

  return (
    <div className="space-y-4">
      <Panel className="!py-3">
        <p className="truncate text-sm font-black">
          {sideName(match.sides[0])} <span className="tsi-muted">v</span>{" "}
          {sideName(match.sides[1])}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-widest tsi-muted">
            {match.format}
          </p>
          <p className="text-sm font-black">{localState.status}</p>
        </div>
      </Panel>

      {!canEdit && (
        <Panel className="!py-3">
          <p className="font-bold">
            <Link href="/login" className="underline">
              Sign in
            </Link>{" "}
            to post scores. You can still follow along here.
          </p>
        </Panel>
      )}

      {/* Hole picker */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="tsi-btn !min-h-[64px] !w-16 text-2xl"
          onClick={() => setHole((h) => Math.max(1, h - 1))}
          aria-label="Previous hole"
        >
          ‹
        </button>
        <div className="tsi-panel flex-1 px-3 py-2 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] tsi-muted">Hole</p>
          <p className="tsi-num text-4xl font-black leading-none">{hole}</p>
          <p className="text-xs font-bold tsi-muted">
            Par {current?.par ?? "–"} · SI {current?.strokeIndex ?? "–"}
            {current?.yardage ? ` · ${current.yardage} yds` : ""}
          </p>
        </div>
        <button
          type="button"
          className="tsi-btn !min-h-[64px] !w-16 text-2xl"
          onClick={() => setHole((h) => Math.min(holes.length, h + 1))}
          aria-label="Next hole"
        >
          ›
        </button>
      </div>

      <div className="tsi-scroll -mx-1 px-1">
        <div className="flex gap-1 pb-1">
          {holes.map((h) => {
            const done = localState.results.find((r) => r.hole === h.number)?.winner != null;
            const active = h.number === hole;
            return (
              <button
                key={h.number}
                type="button"
                onClick={() => setHole(h.number)}
                className="tsi-num h-9 w-9 shrink-0 rounded-lg border-2 text-sm font-black"
                style={{
                  borderColor: active ? "var(--color-turkey)" : "var(--tsi-line)",
                  background: active ? "var(--color-turkey)" : done ? "var(--tsi-panel)" : "transparent",
                  color: active ? "#fff" : "var(--tsi-text)",
                  opacity: done || active ? 1 : 0.7,
                }}
                aria-label={`Go to hole ${h.number}`}
              >
                {h.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entry grid */}
      <Panel className="space-y-3">
        {subjects.map((subject) => {
          const value = valueFor(hole, subject.type, subject.id);
          const strokes = current
            ? strokesOnHole(localState.strokes[subject.id] ?? 0, current.strokeIndex)
            : 0;
          const net =
            value.gross != null && current ? value.gross - strokes : null;
          return (
            <div
              key={`${subject.type}:${subject.id}`}
              className="border-b-2 pb-3 last:border-b-0 last:pb-0"
              style={{ borderColor: "var(--tsi-line)" }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-black">
                  {subject.label}
                  {strokes > 0 && (
                    <span
                      className="ml-2 align-middle text-xs font-black"
                      style={{ color: "var(--color-flag)" }}
                      title={`${strokes} stroke${strokes === 1 ? "" : "s"} on this hole`}
                    >
                      {"•".repeat(Math.min(strokes, 3))}
                    </span>
                  )}
                </p>
                <p className="tsi-num shrink-0 text-sm font-bold tsi-muted">
                  {net != null ? `net ${net}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stepper
                  label={`${subject.label} score`}
                  value={value.gross}
                  min={1}
                  max={20}
                  onChange={(next) => setValue(subject.type, subject.id, "gross", next)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest tsi-muted">
                    Putts
                  </span>
                  <Stepper
                    label={`${subject.label} putts`}
                    value={value.putts}
                    min={0}
                    max={9}
                    tone="small"
                    onChange={(next) => setValue(subject.type, subject.id, "putts", next)}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="tsi-btn tsi-btn-primary w-full text-lg"
          onClick={saveHole}
          disabled={saving || !canEdit}
          style={{ opacity: saving || !canEdit ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : `Save hole ${hole}`}
        </button>

        <p className="text-center text-sm font-bold" aria-live="polite">
          {!online && "○ Offline — scores are kept on this phone"}
          {online && queued.length > 0 && `↻ ${queued.length} hole(s) waiting to sync`}
          {online && queued.length === 0 && status}
          {unsaved && online && queued.length === 0 && !saving && (
            <span className="tsi-muted"> · unsaved changes on this hole</span>
          )}
        </p>

        {holeResult?.winner && (
          <p className="text-center text-sm font-black">
            Hole {hole}:{" "}
            {holeResult.winner === "halved"
              ? "halved"
              : `${sideName(match.sides.find((s) => s.id === holeResult.winner))} wins it`}
          </p>
        )}
      </Panel>

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
      <h2 className="border-b-2 px-4 py-2 text-sm font-black uppercase tracking-widest" style={{ borderColor: "var(--tsi-line)" }}>
        Card
      </h2>
      <div className="tsi-scroll">
        <table className="w-full min-w-[640px] border-collapse text-center">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 px-2 py-1 text-left text-xs font-black uppercase" style={{ background: "var(--tsi-panel)" }}>
                Hole
              </th>
              {holes.map((h) => (
                <th key={h.number} className="tsi-num px-1 py-1 text-xs font-black">
                  {h.number}
                </th>
              ))}
              <th className="tsi-num px-2 py-1 text-xs font-black">Tot</th>
            </tr>
            <tr className="tsi-muted">
              <th className="sticky left-0 z-10 px-2 py-1 text-left text-[11px] font-bold" style={{ background: "var(--tsi-panel)" }}>
                Par
              </th>
              {holes.map((h) => (
                <td key={h.number} className="tsi-num px-1 py-1 text-[11px] font-bold">
                  {h.par}
                </td>
              ))}
              <td className="tsi-num px-2 py-1 text-[11px] font-bold">
                {holes.reduce((sum, h) => sum + h.par, 0)}
              </td>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => {
              let total = 0;
              return (
                <tr key={`${subject.type}:${subject.id}`} className="border-t-2" style={{ borderColor: "var(--tsi-line)" }}>
                  <th className="sticky left-0 z-10 max-w-[7rem] truncate px-2 py-1 text-left text-xs font-black" style={{ background: "var(--tsi-panel)" }}>
                    {subject.label}
                  </th>
                  {holes.map((h) => {
                    const row = lookup.get(key(h.number, subject.type, subject.id));
                    if (row?.gross != null) total += row.gross;
                    return (
                      <td key={h.number} className="tsi-num px-1 py-1 text-sm font-bold">
                        {row?.gross ?? "·"}
                      </td>
                    );
                  })}
                  <td className="tsi-num px-2 py-1 text-sm font-black">{total || "·"}</td>
                </tr>
              );
            })}
            <tr className="border-t-2" style={{ borderColor: "var(--tsi-line)" }}>
              <th className="sticky left-0 z-10 px-2 py-1 text-left text-xs font-black" style={{ background: "var(--tsi-panel)" }}>
                Match
              </th>
              {holes.map((h) => {
                const result = localState.results.find((r) => r.hole === h.number);
                const running = result?.winner ? result.running : null;
                return (
                  <td key={h.number} className="tsi-num px-1 py-1 text-[11px] font-black">
                    {running == null ? "·" : running === 0 ? "AS" : running > 0 ? `${running}▲` : `${-running}▼`}
                  </td>
                );
              })}
              <td className="px-2 py-1 text-[11px] font-black">
                {localState.differential === 0 ? "AS" : Math.abs(localState.differential)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
