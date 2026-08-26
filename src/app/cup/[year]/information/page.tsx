import Link from "next/link";
import { notFound } from "next/navigation";
import { CupNav } from "@/components/SectionNav";
import { Empty, PageTitle, Panel, Stat } from "@/components/ui";
import { cupStandings, pointsToWin, tournamentSessions } from "@/lib/cup";
import { FORMAT_GUIDES } from "@/lib/game-guides";
import { getTournamentByYear, listEntries } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function CupInformationPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const tournament = await getTournamentByYear(Number(year));
  if (!tournament) notFound();

  const [sessions, entries, teams] = await Promise.all([
    tournamentSessions(tournament),
    listEntries(tournament.id),
    cupStandings(tournament.id),
  ]);
  const { available, played, needed } = pointsToWin(sessions);
  // Teams come back in the tournament's own order, so work out the lead rather
  // than assuming the first one is ahead.
  const ranked = [...teams].sort((a, b) => b.points - a.points);
  const holder =
    ranked.length > 1 && ranked[0].points > ranked[1].points ? ranked[0] : null;

  // Only explain the formats this cup actually plays.
  const formats = [...new Set(sessions.map((s) => s.round.format))];
  const courses = [...new Set(sessions.map((s) => s.courseName))];

  return (
    <>
      <PageTitle
        kicker={`${tournament.year} · Information`}
        title="How it works"
        action={
          <Link href="/cup" className="text-[14px] font-semibold underline">
            All years
          </Link>
        }
      />
      <CupNav year={tournament.year} />

      <div className="tsi-stack">
        <section>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Points on offer" value={String(available)} />
            <Stat label="To win the cup" value={String(needed)} />
            <Stat label="Matches decided" value={`${played}`} />
            <Stat label="Players" value={String(entries.length)} />
          </div>
          <p className="mt-4 text-[15px] tsi-muted">
            Every match is worth a point. A halved match splits it. Reach {needed} and
            the cup is yours; reach {available % 2 === 0 ? available / 2 : "a tie"} and,
            if you are holding it, you keep it.
          </p>
        </section>

        <section>
          <h2 className="mb-2">Schedule</h2>
          <p className="mb-5 text-[15px] tsi-muted">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
            {courses.length ? ` across ${courses.length} course${courses.length === 1 ? "" : "s"}` : ""}.
          </p>
          <Panel className="!p-0">
            <ul>
              {sessions.map((session, i) => (
                <li
                  key={session.round.id}
                  className={`flex items-baseline justify-between gap-4 px-5 py-4 ${i > 0 ? "tsi-rule-t" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">
                      Session {session.round.sequence} · {session.formatLabel}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] tsi-muted">
                      {session.courseName}
                      {session.round.played_on ? ` · ${session.round.played_on}` : ""}
                    </span>
                  </span>
                  <span className="tsi-num shrink-0 text-[14px] font-bold">
                    {session.matches.length} pt
                    {session.matches.length === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
              {sessions.length === 0 && (
                <li className="px-5 py-8 text-center text-[15px] tsi-muted">
                  Nothing scheduled yet.
                </li>
              )}
            </ul>
          </Panel>
        </section>

        {formats.length > 0 && (
          <section>
            <h2 className="mb-2">The formats played</h2>
            <p className="mb-5 text-[15px] tsi-muted">
              What each session asks of you, and how the strokes fall.
            </p>
            <div className="tsi-stack-tight">
              {formats.map((format) => {
                const guide = FORMAT_GUIDES.find((g) => g.format === format);
                if (!guide) return null;
                return (
                  <Panel key={format}>
                    <h3>{guide.name}</h3>
                    <p className="mt-0.5 text-[13px] tsi-muted">{guide.players}</p>
                    <p className="mt-3 text-[15px]">{guide.summary}</p>
                    <ul className="mt-4 space-y-1.5">
                      {guide.rules.map((rule) => (
                        <li key={rule} className="flex gap-3 text-[14px] tsi-muted">
                          <span aria-hidden className="shrink-0">·</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                );
              })}
            </div>
          </section>
        )}

        {holder && (
          <section>
            <Panel>
              <h3>Where it stands</h3>
              <p className="mt-2 text-[15px]">
                {holder.name} lead by {formatPoints(holder.points - ranked[1].points)}{" "}
                with {available - played} match{available - played === 1 ? "" : "es"} left
                to play.
              </p>
            </Panel>
          </section>
        )}

        {sessions.length === 0 && entries.length === 0 && (
          <Empty>This cup has not been set up yet.</Empty>
        )}
      </div>
    </>
  );
}

function formatPoints(points: number) {
  return points % 1 === 0 ? String(points) : points.toFixed(1);
}
