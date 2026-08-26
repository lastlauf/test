import Link from "next/link";
import { notFound } from "next/navigation";
import { CupScoreboard, SessionBlock } from "@/components/Cup";
import { CupNav } from "@/components/SectionNav";
import { Empty, PageTitle } from "@/components/ui";
import { cupStandings, pointsToWin, tournamentSessions } from "@/lib/cup";
import { getTournamentByYear } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function CupYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const tournament = await getTournamentByYear(Number(year));
  if (!tournament) notFound();

  const [teams, sessions] = await Promise.all([
    cupStandings(tournament.id),
    tournamentSessions(tournament),
  ]);
  const { available, played, needed } = pointsToWin(sessions);

  return (
    <>
      <PageTitle
        kicker={tournament.status === "complete" ? "Final" : "Leaderboard"}
        title={tournament.name}
        action={
          <Link href="/cup" className="text-[14px] font-semibold underline">
            All years
          </Link>
        }
      />
      <CupNav year={tournament.year} />

      <div className="tsi-stack">
        {teams.length > 0 && (
          <section>
            <CupScoreboard teams={teams} needed={needed} />
            <p className="mt-2 text-center text-[13px] tsi-muted">
              {played} of {available} matches decided
            </p>
          </section>
        )}

        {sessions.map((session) => (
          <SessionBlock key={session.round.id} session={session} />
        ))}

        {sessions.length === 0 && (
          <Empty>No sessions have been scheduled for this cup yet.</Empty>
        )}
      </div>
    </>
  );
}
