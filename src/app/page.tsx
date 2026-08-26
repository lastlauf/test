import Link from "next/link";
import LiveTournament from "@/components/LiveTournament";
import { Empty, LinkButton, PageTitle } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { activeTournament, buildBoard } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [player, tournament] = await Promise.all([currentPlayer(), activeTournament()]);

  if (!tournament) {
    return (
      <>
        <PageTitle kicker="Turkey Slice Invitational" title="No tournament yet" />
        <Empty>
          <span className="block">Nothing has been set up.</span>
          <span className="mt-3 block">
            <Link href="/admin" className="underline">
              Open the admin setup
            </Link>{" "}
            to add a course, this year&apos;s field and the pairings.
          </span>
        </Empty>
      </>
    );
  }

  const initial = await buildBoard(tournament);

  return (
    <>
      <PageTitle
        kicker={
          tournament.status === "active"
            ? "Playing now"
            : tournament.status === "complete"
              ? "Final"
              : "Up next"
        }
        title={tournament.name}
        action={
          !player ? (
            <LinkButton href="/login" variant="primary" className="!min-h-[44px] text-sm">
              Sign in
            </LinkButton>
          ) : null
        }
      />
      <LiveTournament initial={initial} myPlayerId={player?.id ?? null} />
    </>
  );
}
