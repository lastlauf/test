"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Player } from "@/lib/auth";
import { DEFAULT_ALLOWANCE, type Format, sideName } from "@/lib/scoring";
import type { CourseRow, EntryView, MatchView, RoundRow, TeamRow, TeeRow, TournamentRow } from "@/lib/tsi";
import { Panel } from "./ui";
import { Scroller } from "@/components/Scroller";

const STANDARD_HOLES = [
  { par: 4, strokeIndex: 7 }, { par: 5, strokeIndex: 13 }, { par: 4, strokeIndex: 1 },
  { par: 3, strokeIndex: 17 }, { par: 4, strokeIndex: 5 }, { par: 4, strokeIndex: 11 },
  { par: 3, strokeIndex: 15 }, { par: 5, strokeIndex: 9 }, { par: 4, strokeIndex: 3 },
  { par: 4, strokeIndex: 8 }, { par: 5, strokeIndex: 14 }, { par: 3, strokeIndex: 18 },
  { par: 4, strokeIndex: 2 }, { par: 4, strokeIndex: 10 }, { par: 4, strokeIndex: 6 },
  { par: 3, strokeIndex: 16 }, { par: 5, strokeIndex: 12 }, { par: 4, strokeIndex: 4 },
];

interface Props {
  players: Player[];
  courses: (CourseRow & { tees: TeeRow[] })[];
  tournaments: TournamentRow[];
  selected: TournamentRow | null;
  teams: TeamRow[];
  entries: EntryView[];
  rounds: RoundRow[];
  matchesByRound: Record<string, MatchView[]>;
}

async function post(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "DELETE" ? undefined : JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(parsed.error ?? "Request failed");
  return parsed;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </Panel>
  );
}

export default function Admin(props: Props) {
  const router = useRouter();
  const { players, courses, tournaments, selected, teams, entries, rounds, matchesByRound } = props;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // --- course ---
  const [courseForm, setCourseForm] = useState({
    name: "",
    city: "",
    state: "",
    teeName: "Blue",
    rating: "72.0",
    slope: "130",
  });
  const [holes, setHoles] = useState(STANDARD_HOLES);

  // --- tournament ---
  const thisYear = new Date().getFullYear();
  const [tournamentForm, setTournamentForm] = useState({
    year: String(thisYear),
    name: "",
    courseId: courses[0]?.id ?? "",
    teamA: "Dark Meat",
    teamB: "White Meat",
    status: "active",
  });

  // --- field ---
  const [fieldTeam, setFieldTeam] = useState(teams[0]?.id ?? "");
  const [fieldPlayers, setFieldPlayers] = useState<string[]>([]);

  // --- round ---
  const [roundForm, setRoundForm] = useState({
    name: "",
    format: "fourball" as Format,
    courseId: selected?.course_id ?? courses[0]?.id ?? "",
    teeId: "",
    playedOn: "",
  });

  // --- pairings ---
  const [pairRound, setPairRound] = useState(rounds[0]?.id ?? "");
  const [sideA, setSideA] = useState<string[]>([]);
  const [sideB, setSideB] = useState<string[]>([]);

  const entryName = (id: string) =>
    entries.find((e) => e.playerId === id)?.displayName ?? "?";
  const teamOf = (id: string) => entries.find((e) => e.playerId === id)?.teamId ?? null;

  const toggle = (list: string[], setList: (next: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const selectedRound = rounds.find((r) => r.id === pairRound);
  const perSide = selectedRound?.format === "singles" ? 1 : 2;

  return (
    <div className="tsi-stack-tight">
      {error && (
        <Panel>
          <p className="font-bold" style={{ color: "var(--color-flag)" }}>
            {error}
          </p>
        </Panel>
      )}

      {tournaments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tournaments.map((t) => (
            <a
              key={t.id}
              href={`/admin?t=${t.id}`}
              className="tsi-tap flex items-center rounded-xl tsi-rule px-3 text-sm font-bold"
              style={{
                borderColor: t.id === selected?.id ? "var(--color-ink)" : "var(--tsi-line)",
                background: t.id === selected?.id ? "var(--color-ink)" : "transparent",
                color: t.id === selected?.id ? "#fff" : "var(--tsi-text)",
              }}
            >
              {t.year}
            </a>
          ))}
        </div>
      )}

      <Section title="1. Course">
        {courses.length > 0 && (
          <ul className="mb-2 space-y-1">
            {courses.map((course) => (
              <li key={course.id} className="text-sm font-bold">
                {course.name}{" "}
                <span className="tsi-muted">
                  — {course.tees.map((t) => `${t.name} ${t.rating}/${t.slope}`).join(", ") || "no tees"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input
            className="tsi-field"
            placeholder="Course name"
            value={courseForm.name}
            onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
          />
          <input
            className="tsi-field"
            placeholder="City"
            value={courseForm.city}
            onChange={(e) => setCourseForm({ ...courseForm, city: e.target.value })}
          />
          <input
            className="tsi-field"
            placeholder="Tee name"
            value={courseForm.teeName}
            onChange={(e) => setCourseForm({ ...courseForm, teeName: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="tsi-field tsi-num"
              inputMode="decimal"
              placeholder="Rating"
              value={courseForm.rating}
              onChange={(e) => setCourseForm({ ...courseForm, rating: e.target.value })}
            />
            <input
              className="tsi-field tsi-num"
              inputMode="numeric"
              placeholder="Slope"
              value={courseForm.slope}
              onChange={(e) => setCourseForm({ ...courseForm, slope: e.target.value })}
            />
          </div>
        </div>
        <Scroller className="tsi-on-panel">
          <table className="min-w-[640px] border-collapse text-center">
            <tbody>
              <tr>
                <th className="px-1 text-left text-xs font-bold">Hole</th>
                {holes.map((_, i) => (
                  <td key={i} className="tsi-num px-1 text-xs font-bold">
                    {i + 1}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="px-1 text-left text-xs font-bold">Par</th>
                {holes.map((hole, i) => (
                  <td key={i} className="px-0.5">
                    <input
                      aria-label={`Hole ${i + 1} par`}
                      className="tsi-num w-9 rounded tsi-rule py-1 text-center text-sm font-bold"
                      style={{ borderColor: "var(--tsi-line)", background: "var(--tsi-shell)" }}
                      value={hole.par}
                      onChange={(e) => {
                        const next = [...holes];
                        next[i] = { ...hole, par: Number(e.target.value) || 0 };
                        setHoles(next);
                      }}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <th className="px-1 text-left text-xs font-bold">SI</th>
                {holes.map((hole, i) => (
                  <td key={i} className="px-0.5">
                    <input
                      aria-label={`Hole ${i + 1} stroke index`}
                      className="tsi-num w-9 rounded tsi-rule py-1 text-center text-sm font-bold"
                      style={{ borderColor: "var(--tsi-line)", background: "var(--tsi-shell)" }}
                      value={hole.strokeIndex}
                      onChange={(e) => {
                        const next = [...holes];
                        next[i] = { ...hole, strokeIndex: Number(e.target.value) || 0 };
                        setHoles(next);
                      }}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Scroller>
        <button
          type="button"
          className="tsi-btn w-full"
          disabled={busy}
          onClick={() =>
            run(() =>
              post("/api/admin/courses", {
                name: courseForm.name,
                city: courseForm.city,
                state: courseForm.state,
                tees: [
                  {
                    name: courseForm.teeName,
                    rating: Number(courseForm.rating),
                    slope: Number(courseForm.slope),
                  },
                ],
                holes: holes.map((hole, i) => ({ ...hole, number: i + 1 })),
              }),
            )
          }
        >
          Add course
        </button>
      </Section>

      <Section title="2. Tournament">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="tsi-field tsi-num"
            inputMode="numeric"
            placeholder="Year"
            value={tournamentForm.year}
            onChange={(e) => setTournamentForm({ ...tournamentForm, year: e.target.value })}
          />
          <select
            className="tsi-field"
            value={tournamentForm.courseId}
            onChange={(e) => setTournamentForm({ ...tournamentForm, courseId: e.target.value })}
          >
            <option value="">Course…</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          <input
            className="tsi-field"
            placeholder="Team A"
            value={tournamentForm.teamA}
            onChange={(e) => setTournamentForm({ ...tournamentForm, teamA: e.target.value })}
          />
          <input
            className="tsi-field"
            placeholder="Team B"
            value={tournamentForm.teamB}
            onChange={(e) => setTournamentForm({ ...tournamentForm, teamB: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="tsi-btn w-full"
          disabled={busy}
          onClick={() =>
            run(() =>
              post("/api/admin/tournaments", {
                year: Number(tournamentForm.year),
                name: tournamentForm.name || undefined,
                courseId: tournamentForm.courseId || undefined,
                status: tournamentForm.status,
                teams: [
                  { name: tournamentForm.teamA, color: "#7c2d12" },
                  { name: tournamentForm.teamB, color: "#0f766e" },
                ],
              }),
            )
          }
        >
          Create tournament
        </button>
      </Section>

      {selected && (
        <>
          <Section title={`3. Field — ${selected.year}`}>
            <ul className="mb-2 space-y-1">
              {entries.map((entry) => (
                <li key={entry.playerId} className="flex items-center justify-between text-sm font-bold">
                  <span>
                    {entry.displayName}{" "}
                    <span className="tsi-muted">{entry.teamName ?? "no team"}</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs font-bold uppercase"
                    style={{ color: "var(--color-flag)" }}
                    onClick={() =>
                      run(() =>
                        post(
                          `/api/admin/tournaments/${selected.id}/entries?playerId=${entry.playerId}`,
                          null,
                          "DELETE",
                        ),
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
              {entries.length === 0 && <li className="font-semibold tsi-muted">Nobody entered yet.</li>}
            </ul>
            <select className="tsi-field" value={fieldTeam} onChange={(e) => setFieldTeam(e.target.value)}>
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => {
                const on = fieldPlayers.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => toggle(fieldPlayers, setFieldPlayers, player.id)}
                    className="tsi-tap rounded-xl tsi-rule px-3 text-sm font-bold"
                    style={{
                      borderColor: on ? "var(--color-ink)" : "var(--tsi-line)",
                      background: on ? "var(--color-ink)" : "transparent",
                      color: on ? "#fff" : "var(--tsi-text)",
                    }}
                  >
                    {player.display_name}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="tsi-btn w-full"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await post(`/api/admin/tournaments/${selected.id}/entries`, {
                    playerIds: fieldPlayers,
                    teamId: fieldTeam || null,
                  });
                  setFieldPlayers([]);
                })
              }
            >
              Add to {teams.find((t) => t.id === fieldTeam)?.name ?? "field"}
            </button>
          </Section>

          <Section title="4. Rounds">
            <ul className="mb-2 space-y-1">
              {rounds.map((round) => (
                <li key={round.id} className="text-sm font-bold">
                  {round.sequence}. {round.name}{" "}
                  <span className="tsi-muted">
                    {round.format} · {round.status}
                  </span>
                </li>
              ))}
              {rounds.length === 0 && <li className="font-semibold tsi-muted">No rounds yet.</li>}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="tsi-field"
                placeholder="Round name"
                value={roundForm.name}
                onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
              />
              <select
                className="tsi-field"
                value={roundForm.format}
                onChange={(e) => setRoundForm({ ...roundForm, format: e.target.value as Format })}
              >
                <option value="fourball">Fourball</option>
                <option value="foursome">Foursome</option>
                <option value="singles">Singles</option>
              </select>
              <select
                className="tsi-field"
                value={roundForm.courseId}
                onChange={(e) => setRoundForm({ ...roundForm, courseId: e.target.value, teeId: "" })}
              >
                <option value="">Course…</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              <select
                className="tsi-field"
                value={roundForm.teeId}
                onChange={(e) => setRoundForm({ ...roundForm, teeId: e.target.value })}
              >
                <option value="">Tee…</option>
                {courses
                  .find((course) => course.id === roundForm.courseId)
                  ?.tees.map((tee) => (
                    <option key={tee.id} value={tee.id}>
                      {tee.name} ({tee.rating}/{tee.slope})
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="button"
              className="tsi-btn w-full"
              disabled={busy}
              onClick={() =>
                run(() =>
                  post("/api/admin/rounds", {
                    tournamentId: selected.id,
                    name: roundForm.name,
                    format: roundForm.format,
                    courseId: roundForm.courseId,
                    teeId: roundForm.teeId || null,
                    playedOn: roundForm.playedOn || null,
                    allowance: DEFAULT_ALLOWANCE[roundForm.format],
                  }),
                )
              }
            >
              Add round
            </button>
          </Section>

          <Section title="5. Pairings">
            <select className="tsi-field" value={pairRound} onChange={(e) => setPairRound(e.target.value)}>
              <option value="">Round…</option>
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name} ({round.format})
                </option>
              ))}
            </select>
            {pairRound && (
              <>
                <ul className="space-y-1">
                  {(matchesByRound[pairRound] ?? []).map((match) => (
                    <li key={match.id} className="flex items-center justify-between text-sm font-bold">
                      <span className="truncate">
                        {match.name}: {sideName(match.sides[0])} v {sideName(match.sides[1])}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-bold uppercase"
                        style={{ color: "var(--color-flag)" }}
                        onClick={() =>
                          run(() =>
                            post(
                              `/api/admin/rounds/${pairRound}/matches?matchId=${match.id}`,
                              null,
                              "DELETE",
                            ),
                          )
                        }
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
                {(["A", "B"] as const).map((label) => {
                  const list = label === "A" ? sideA : sideB;
                  const setList = label === "A" ? setSideA : setSideB;
                  return (
                    <div key={label}>
                      <p className="tsi-label">
                        Side {label} — pick {perSide} ({list.map(entryName).join(", ") || "none"})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {entries.map((entry) => {
                          const on = list.includes(entry.playerId);
                          return (
                            <button
                              key={entry.playerId}
                              type="button"
                              onClick={() => toggle(list, setList, entry.playerId)}
                              className="tsi-tap rounded-xl tsi-rule px-3 text-sm font-bold"
                              style={{
                                borderColor: on ? "var(--color-ink)" : "var(--tsi-line)",
                                background: on ? "var(--color-ink)" : "transparent",
                                color: on ? "#fff" : "var(--tsi-text)",
                              }}
                            >
                              {entry.displayName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="tsi-btn w-full"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await post(`/api/admin/rounds/${pairRound}/matches`, {
                        sides: [
                          { label: "A", teamId: teamOf(sideA[0] ?? ""), playerIds: sideA },
                          { label: "B", teamId: teamOf(sideB[0] ?? ""), playerIds: sideB },
                        ],
                      });
                      setSideA([]);
                      setSideB([]);
                    })
                  }
                >
                  Create match
                </button>
              </>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
