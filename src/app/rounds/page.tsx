import { RoundsTable } from "@/components/RoundsTable";
import { SectionNav } from "@/components/SectionNav";
import { PageTitle } from "@/components/ui";
import { listRoundRows } from "@/lib/cup";

export const dynamic = "force-dynamic";

export default async function RoundsPage() {
  const rows = await listRoundRows();

  return (
    <>
      <PageTitle kicker="Record book" title="Rounds" />
      <SectionNav />

      <div className="tsi-stack">
        <section>
          <h2 className="mb-2">Every card posted</h2>
          <p className="mb-5 text-[15px] tsi-muted">
            One line per player per session — or per pair in a foursome, where two
            players share a ball and so share a card. Hcp is the strokes actually
            received: a course handicap after the session&apos;s allowance, which is
            half the combined handicap in a foursome and 90% of it in a fourball.
          </p>
          <RoundsTable rows={rows} />
        </section>
      </div>
    </>
  );
}
