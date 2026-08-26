import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle, Panel, Stat } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { getCourseDetail } from "@/lib/cup";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, player] = await Promise.all([getCourseDetail(id), currentPlayer()]);
  if (!detail) notFound();

  const main = detail.tees[0] ?? null;

  return (
    <>
      <PageTitle
        kicker="Course"
        title={detail.course.name}
        action={
          player ? (
            <Link
              href={`/courses/${id}/edit`}
              className="text-[14px] font-semibold underline"
            >
              Edit
            </Link>
          ) : undefined
        }
      />

      <div className="tsi-stack">
        <section>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Yards" value={main?.yardage ?? "—"} />
            <Stat label="Par" value={detail.par ?? "—"} />
            <Stat label="Slope" value={main?.slope ?? "—"} />
            <Stat label="Rating" value={main?.rating?.toFixed(1) ?? "—"} />
          </div>
          {(detail.course.city || detail.course.state) && (
            <p className="mt-4 text-[15px] tsi-muted">
              {[detail.course.city, detail.course.state].filter(Boolean).join(", ")}
            </p>
          )}
        </section>

        {detail.tees.length > 1 && (
          <section>
            <h2 className="mb-2">Tees</h2>
            <p className="mb-5 text-[15px] tsi-muted">
              Each set plays to its own rating and slope.
            </p>
            <Panel className="!p-0">
              <ul>
                {detail.tees.map((tee, i) => (
                  <li
                    key={tee.id}
                    className={`flex items-baseline justify-between gap-4 px-5 py-4 ${i > 0 ? "tsi-rule-t" : ""}`}
                  >
                    <span className="text-[15px] font-semibold">{tee.name}</span>
                    <span className="tsi-num text-[14px] font-bold tsi-muted">
                      {tee.yardage ? `${tee.yardage} yds · ` : ""}
                      {tee.slope} / {tee.rating.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>
        )}

        <section>
          <Panel>
            <h3>Holes</h3>
            <p className="mt-2 text-[15px] tsi-muted">
              {detail.holes > 0
                ? `${detail.holes} holes on file, ${detail.par ? `par ${detail.par}` : "par unknown"}. Stroke indexes decide where handicap strokes fall.`
                : "No holes on file yet, so handicap strokes can't be worked out here."}
            </p>
            <p className="mt-4">
              <Link href="/courses" className="text-[14px] font-semibold underline">
                Back to courses
              </Link>
            </p>
          </Panel>
        </section>
      </div>
    </>
  );
}
