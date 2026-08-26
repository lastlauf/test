import { StatsTable } from "@/components/StatsTable";
import { PageTitle } from "@/components/ui";
import { allPlayerStats } from "@/lib/cup";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const rows = await allPlayerStats();
  const played = rows.filter((r) => r.matches > 0).length;

  return (
    <>
      <PageTitle title="Stats" />

      <div className="tsi-stack">
        <section>
          <h2 className="mb-2">Every player, every match</h2>
          <p className="mb-5 text-[15px] tsi-muted">
            {played === 0
              ? "Nobody has a record yet. Rows fill in as matches finish."
              : `Lifetime records for ${played} player${played === 1 ? "" : "s"}, counting every match that has been decided. Tap a column to sort by it.`}
          </p>
          <StatsTable rows={rows} />
        </section>
      </div>
    </>
  );
}
