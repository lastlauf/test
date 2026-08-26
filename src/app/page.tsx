import Link from "next/link";
import { CupScoreboard, SessionBlock } from "@/components/Cup";
import { Panel } from "@/components/ui";
import { cupStandings, pointsToWin, tournamentSessions } from "@/lib/cup";
import { activeTournament, listTournaments } from "@/lib/tsi";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/cup",
    title: "Tournaments",
    blurb: "Every cup by year, session by session.",
  },
  {
    href: "/rounds",
    title: "Rounds",
    blurb: "Every card posted, with gross, strokes and net.",
  },
  {
    href: "/stats",
    title: "Stats",
    blurb: "Lifetime records, points and birdies for every player.",
  },
  {
    href: "/courses",
    title: "Courses",
    blurb: "Yardage, par, slope and rating for where we play.",
  },
];

export default async function HomePage() {
  // The cup being played, or the most recent one if nothing is live.
  const active = await activeTournament();
  const tournament = active ?? (await listTournaments())[0] ?? null;

  const [teams, sessions] = tournament
    ? await Promise.all([cupStandings(tournament.id), tournamentSessions(tournament)])
    : [[], []];
  const { available, played, needed } = pointsToWin(sessions);

  // Anything still out on the course, else the last session played.
  const live = sessions.filter((s) => s.matches.some((m) => !m.decided));
  const showing = live.length > 0 ? live.slice(0, 1) : sessions.slice(-1);

  return (
    <>
      <div className="mb-8">
        <p className="mb-1.5 text-[13px] font-semibold tsi-muted">
          Turkey Slice Invitational
        </p>
        <h1>The record book</h1>
        <p className="mt-3 max-w-[34rem] text-[16px] tsi-muted">
          Every cup, every session, every card and what it did to your record.
        </p>
      </div>

      <div className="tsi-stack">
        {tournament ? (
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2>{tournament.name}</h2>
              <Link
                href={`/cup/${tournament.year}`}
                className="shrink-0 text-[14px] font-semibold underline"
              >
                Full card
              </Link>
            </div>
            {teams.length > 0 && <CupScoreboard teams={teams} needed={needed} />}
            <p className="mt-2 text-center text-[13px] tsi-muted">
              {played} of {available} matches decided
            </p>
          </section>
        ) : (
          <Panel className="!py-10 text-center">
            <p className="text-[16px] font-semibold">No cup on the books yet.</p>
            <p className="mx-auto mt-2 max-w-[24rem] text-[15px] tsi-muted">
              Once a tournament is set up, the score and every session land here.
            </p>
          </Panel>
        )}

        {showing.map((session) => (
          <SessionBlock key={session.round.id} session={session} />
        ))}

        <section>
          <h2 className="mb-4">The record book</h2>
          <div className="tsi-stack-tight">
            {SECTIONS.map((section) => (
              <Link key={section.href} href={section.href} className="block">
                <Panel className="flex items-center justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[17px] font-bold">{section.title}</span>
                    <span className="mt-0.5 block text-[14px] tsi-muted">
                      {section.blurb}
                    </span>
                  </span>
                  <span aria-hidden className="shrink-0 text-[18px] font-bold">
                    →
                  </span>
                </Panel>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <Panel>
            <h3>Playing today?</h3>
            <p className="mt-2 text-[15px] tsi-muted">
              Live scoring, the games you start from your phone and the side-bet ledger
              are all still here — they live in the archive now.
            </p>
            <p className="mt-4">
              <Link href="/archive" className="text-[14px] font-semibold underline">
                Open the archive
              </Link>
            </p>
          </Panel>
        </section>
      </div>
    </>
  );
}
