import Link from "next/link";
import type { CupSession } from "@/lib/cup";
import type { TeamStanding } from "@/lib/tsi";
import { Panel } from "./ui";

/**
 * The cup score: two teams, one number each, and the number it takes to win.
 * The leader is filled in solid — at arm's length in the sun that reads faster
 * than comparing two numerals.
 */
export function CupScoreboard({
  teams,
  needed,
}: {
  teams: TeamStanding[];
  needed: number;
}) {
  const [home, away] = teams;
  if (!home) return null;
  const leader =
    !away || home.points === away.points
      ? null
      : home.points > away.points
        ? home.teamId
        : away.teamId;

  return (
    <div>
      <div className="tsi-rule grid grid-cols-2 overflow-hidden rounded-2xl">
        {[home, away].filter(Boolean).map((team, i) => {
          const winning = leader === team!.teamId;
          return (
            <div
              key={team!.teamId}
              className="px-5 py-6"
              style={{
                background: winning ? "var(--tsi-text)" : "var(--tsi-shell)",
                color: winning ? "var(--tsi-shell)" : "var(--tsi-text)",
                textAlign: i === 0 ? "left" : "right",
                borderLeftWidth: i === 1 ? "var(--tsi-rule)" : undefined,
                borderLeftStyle: i === 1 ? "solid" : undefined,
                borderLeftColor: i === 1 ? "var(--tsi-line)" : undefined,
              }}
            >
              <p className="text-[13px] font-semibold" style={{ opacity: 0.75 }}>
                {team!.name}
              </p>
              <p className="tsi-num text-[44px] font-extrabold leading-none">
                {format(team!.points)}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[14px] tsi-muted">
        {needed} points wins the cup
      </p>
    </div>
  );
}

function format(points: number) {
  return points % 1 === 0 ? String(points) : points.toFixed(1);
}

/**
 * A session and its matches, home team down the left, away down the right, the
 * result in the middle pointing at whoever took it.
 */
export function SessionBlock({ session }: { session: CupSession }) {
  return (
    <section>
      <div className="mb-4">
        <h2>
          Session {session.round.sequence} · {session.formatLabel}
        </h2>
        <p className="mt-1 text-[14px] tsi-muted">
          {[session.round.played_on, session.courseName].filter(Boolean).join(" · ")}
        </p>
      </div>

      <Panel className="!p-0">
        <ul>
          {session.matches.map((match, i) => (
            <li
              key={match.matchId}
              className={`grid items-center gap-3 px-4 py-4 ${i > 0 ? "tsi-rule-t" : ""}`}
              style={{ gridTemplateColumns: "1fr auto 1fr" }}
            >
              <span
                className="min-w-0 text-[14px]"
                style={{ fontWeight: match.winner === "home" ? 700 : 500 }}
              >
                {match.home?.label ?? "—"}
              </span>

              <span className="text-center">
                <span className="flex items-center justify-center gap-1.5 text-[14px] font-bold">
                  {match.winner === "home" && <span aria-hidden>◀</span>}
                  <span>{match.result}</span>
                  {match.winner === "away" && <span aria-hidden>▶</span>}
                </span>
                <Link
                  href={`/score/${match.matchId}`}
                  className="mt-0.5 block text-[12px] font-semibold underline tsi-muted"
                >
                  Match details
                </Link>
              </span>

              <span
                className="min-w-0 text-right text-[14px]"
                style={{ fontWeight: match.winner === "away" ? 700 : 500 }}
              >
                {match.away?.label ?? "—"}
              </span>
            </li>
          ))}
          {session.matches.length === 0 && (
            <li className="px-5 py-8 text-center text-[15px] tsi-muted">
              No matches in this session yet.
            </li>
          )}
        </ul>
      </Panel>

      {session.lastUpdated && (
        <p className="mt-2 text-[12px] tsi-muted">
          Last score posted {session.lastUpdated.slice(0, 16).replace("T", " ")}
        </p>
      )}
    </section>
  );
}
