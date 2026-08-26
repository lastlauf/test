import Link from "next/link";
import { Empty, PageTitle, Panel } from "@/components/ui";
import { listTournaments, teamStandings } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const tournaments = listTournaments();

  return (
    <>
      <PageTitle kicker="History" title="Tournament archive" />
      <div className="space-y-3">
        {tournaments.map((tournament) => {
          const teams = teamStandings(tournament.id);
          return (
            <Link key={tournament.id} href={`/archive/${tournament.year}`} className="block">
              <Panel className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-xl font-black">{tournament.year}</span>
                  <span className="block truncate text-sm font-bold tsi-muted">
                    {tournament.champion
                      ? `Champion: ${tournament.champion}`
                      : tournament.status === "active"
                        ? "In progress"
                        : "Not yet played"}
                  </span>
                </span>
                <span className="tsi-num shrink-0 text-right font-black">
                  {teams.map((t) => t.points).join(" – ")}
                </span>
              </Panel>
            </Link>
          );
        })}
        {tournaments.length === 0 && <Empty>No tournaments recorded yet.</Empty>}
      </div>
    </>
  );
}
