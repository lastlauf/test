import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PageTitle, Panel } from "@/components/ui";
import { listPlayers } from "@/lib/auth";
import { playerRecord, winPercent } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = listPlayers().map((player) => ({
    player,
    record: playerRecord(player.id),
  }));

  return (
    <>
      <PageTitle kicker="Roster" title="Players" />
      <Panel className="!p-0">
        <ul>
          {players.map(({ player, record }) => {
            const pct = winPercent(record.overall);
            return (
              <li key={player.id} className="border-b-2 last:border-b-0" style={{ borderColor: "var(--tsi-line)" }}>
                <Link href={`/players/${player.username}`} className="flex items-center gap-3 px-3 py-3">
                  <Avatar name={player.display_name} photo={player.photo} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black">{player.display_name}</span>
                    <span className="block text-xs font-bold tsi-muted">
                      Index {player.handicap_index.toFixed(1)}
                      {player.member_since ? ` · since ${player.member_since}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tsi-num block font-black">
                      {record.overall.wins}-{record.overall.losses}
                      {record.overall.halves ? `-${record.overall.halves}` : ""}
                    </span>
                    <span className="block text-xs font-bold tsi-muted">
                      {pct == null ? "no record" : `${pct.toFixed(0)}%`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          {players.length === 0 && (
            <li className="px-3 py-6 text-center font-semibold tsi-muted">
              No players have signed up yet.
            </li>
          )}
        </ul>
      </Panel>
    </>
  );
}
