import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { CupNav } from "@/components/CupNav";
import { Empty, PageTitle, Panel, TeamDot } from "@/components/ui";
import { cupRecords, tournamentSessions } from "@/lib/cup";
import { getTournamentByYear, listEntries, listTeams } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function CupPlayersPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const tournament = await getTournamentByYear(Number(year));
  if (!tournament) notFound();

  const [teams, entries, sessions] = await Promise.all([
    listTeams(tournament.id),
    listEntries(tournament.id),
    tournamentSessions(tournament),
  ]);
  const records = cupRecords(sessions);

  // Anyone entered without a team still belongs on the page.
  const groups = [
    ...teams.map((team) => ({
      key: team.id,
      name: team.name,
      color: team.color as string | null,
      players: entries.filter((e) => e.teamId === team.id),
    })),
    {
      key: "none",
      name: "Unassigned",
      color: null,
      players: entries.filter((e) => !e.teamId),
    },
  ].filter((group) => group.players.length > 0);

  return (
    <>
      <PageTitle
        kicker={`${tournament.year} · Roster`}
        title="Players"
        action={
          <Link href="/cup" className="text-[14px] font-semibold underline">
            All years
          </Link>
        }
      />
      <CupNav year={tournament.year} />

      <div className="tsi-stack">
        {groups.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2 flex items-center gap-2">
              <TeamDot color={group.color} />
              {group.name}
            </h2>
            <p className="mb-5 text-[15px] tsi-muted">
              {group.players.length} player{group.players.length === 1 ? "" : "s"} ·{" "}
              {format(
                group.players.reduce(
                  (sum, p) => sum + (records.get(p.playerId)?.points ?? 0),
                  0,
                ),
              )}{" "}
              points between them
            </p>
            <Panel className="!p-0">
              <ul>
                {group.players.map((entry, i) => {
                  const record = records.get(entry.playerId);
                  return (
                    <li key={entry.playerId} className={i > 0 ? "tsi-rule-t" : ""}>
                      <Link
                        href={`/players/${entry.username}`}
                        className="flex items-center gap-4 px-5 py-4"
                      >
                        <Avatar name={entry.displayName} photo={entry.photo} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">
                            {entry.displayName}
                          </span>
                          <span className="block text-[13px] font-semibold tsi-muted">
                            Index {entry.handicapIndex.toFixed(1)}
                            {entry.courseHandicapOverride != null
                              ? ` · plays off ${entry.courseHandicapOverride}`
                              : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="tsi-num block text-[15px] font-bold">
                            {record
                              ? `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ""}`
                              : "—"}
                          </span>
                          <span className="block text-[12px] font-semibold tsi-muted">
                            {record ? `${format(record.points)} pts` : "no matches"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>
        ))}

        {groups.length === 0 && (
          <Empty>Nobody has been entered in this cup yet.</Empty>
        )}
      </div>
    </>
  );
}

function format(points: number) {
  return points % 1 === 0 ? String(points) : points.toFixed(1);
}
