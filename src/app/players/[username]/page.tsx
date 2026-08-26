import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PageTitle, Panel, Stat } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { db } from "@/lib/db";
import { FORMAT_LABEL, type Format } from "@/lib/scoring";
import { playerRecord, winPercent } from "@/lib/tsi";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  username: string;
  display_name: string;
  handicap_index: number;
  ghin: string | null;
  photo: string | null;
  member_since: number | null;
  bio: string | null;
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const player = await db().one<Row>(
    `SELECT id, username, display_name, handicap_index, ghin, photo, member_since, bio
     FROM players WHERE lower(username) = lower(?)`,
    [username],
  );
  if (!player) notFound();

  const [me, record] = await Promise.all([currentPlayer(), playerRecord(player.id)]);
  const tenure = player.member_since
    ? new Date().getFullYear() - player.member_since + 1
    : null;
  const overallPct = winPercent(record.overall);

  return (
    <>
      <PageTitle
        title={player.display_name}
        action={
          me?.id === player.id ? (
            <Link href="/me" className="text-[14px] font-semibold">
              Edit
            </Link>
          ) : null
        }
      />

      <div className="tsi-stack-tight">
        <Panel className="flex items-center gap-4">
          <Avatar name={player.display_name} photo={player.photo} size={72} />
          <div className="min-w-0">
            <p className="tsi-num text-[19px] font-bold">
              Index {player.handicap_index.toFixed(1)}
            </p>
            <p className="text-sm font-bold tsi-muted">
              {player.ghin ? `GHIN ${player.ghin}` : "No GHIN on file"}
            </p>
            <p className="text-sm font-bold tsi-muted">
              {tenure ? `${tenure} year${tenure === 1 ? "" : "s"} of TSI` : "Tenure unknown"}
              {` · ${record.tournaments} played`}
            </p>
          </div>
        </Panel>

        {player.bio && (
          <Panel>
            <p className="font-semibold">{player.bio}</p>
          </Panel>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Lifetime"
            value={`${record.overall.wins}-${record.overall.losses}`}
            sub={record.overall.halves ? `${record.overall.halves} halved` : "matches"}
          />
          <Stat
            label="Win %"
            value={overallPct == null ? "—" : `${overallPct.toFixed(0)}%`}
            sub="halves = ½"
          />
          <Stat label="Titles" value={record.championships} sub="TSI wins" />
        </div>

        <Panel>
          <h2 className="mb-4">By format</h2>
          <ul className="space-y-2">
            {(Object.keys(record.byFormat) as Format[]).map((format) => {
              const value = record.byFormat[format];
              const pct = winPercent(value);
              return (
                <li key={format} className="flex items-center justify-between gap-3">
                  <span className="text-[15px]">{FORMAT_LABEL[format]}</span>
                  <span className="text-right">
                    <span className="tsi-num block font-bold">
                      {value.wins}-{value.losses}
                      {value.halves ? `-${value.halves}` : ""}
                    </span>
                    <span className="block text-xs font-bold tsi-muted">
                      {pct == null ? "—" : `${pct.toFixed(0)}%`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <h2 className="mb-4">Head to head</h2>
          <ul className="space-y-1">
            {record.headToHead.map((row) => (
              <li key={row.opponentId} className="flex items-center justify-between gap-3 py-1">
                <Link href={`/players/${row.opponentUsername}`} className="truncate text-[15px]">
                  {row.opponentName}
                </Link>
                <span className="tsi-num shrink-0 text-[15px] font-bold">
                  {row.wins}-{row.losses}
                  {row.halves ? `-${row.halves}` : ""}
                </span>
              </li>
            ))}
            {record.headToHead.length === 0 && (
              <li className="font-semibold tsi-muted">No completed matches yet.</li>
            )}
          </ul>
        </Panel>

        {record.partners.length > 0 && (
          <Panel>
            <h2 className="mb-4">Partners</h2>
            <ul className="space-y-1">
              {record.partners.map((row) => (
                <li key={row.playerId} className="flex items-center justify-between gap-3 py-1">
                  <span className="truncate text-[15px]">{row.name}</span>
                  <span className="tsi-num shrink-0 text-[15px] font-bold">
                    {row.wins}-{row.losses}
                    {row.halves ? `-${row.halves}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
