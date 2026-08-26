import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileEditor from "@/components/ProfileEditor";
import { PageTitle } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const player = await currentPlayer();
  if (!player) redirect("/login");

  return (
    <>
      <PageTitle
        kicker="Your account"
        title={player.display_name}
        action={
          <Link href={`/players/${player.username}`} className="text-sm font-bold underline">
            Profile
          </Link>
        }
      />
      {player.is_admin === 1 && (
        <Link href="/admin" className="tsi-btn mb-4 w-full">
          ⚙ Tournament admin
        </Link>
      )}
      <ProfileEditor player={player} />
    </>
  );
}
