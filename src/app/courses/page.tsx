import Link from "next/link";
import { Empty, PageTitle } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { listCourseRows } from "@/lib/cup";
import { Scroller } from "@/components/Scroller";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [courses, player] = await Promise.all([listCourseRows(), currentPlayer()]);

  return (
    <>
      <PageTitle
        kicker="Record book"
        title="Courses"
        action={
          player ? (
            <Link href="/courses/new" className="text-[14px] font-semibold underline">
              Add course
            </Link>
          ) : undefined
        }
      />

      <div className="tsi-stack">
        <section>
          <h2 className="mb-2">Where the cup is played</h2>
          <p className="mb-5 text-[15px] tsi-muted">
            Slope and rating are what turn a handicap index into strokes on the day, so
            each course carries its own.
          </p>

          {courses.length === 0 ? (
            <Empty>
              No courses yet.{" "}
              {player ? (
                <Link href="/courses/new" className="underline">
                  Add the first one
                </Link>
              ) : (
                "Sign in to add one."
              )}
            </Empty>
          ) : (
            <Scroller className="tsi-panel !p-0">
              <table className="tsi-table">
                <thead>
                  <tr>
                    <th scope="col" className="tsi-col-lead">Course</th>
                    <th scope="col" className="tsi-col-num">Yards</th>
                    <th scope="col" className="tsi-col-num">Par</th>
                    <th scope="col" className="tsi-col-num">Slope</th>
                    <th scope="col" className="tsi-col-num">Rating</th>
                    <th scope="col">
                      <span className="sr-only">Detail</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td className="tsi-col-lead">
                        <Link href={`/courses/${course.id}`} className="font-semibold underline">
                          {course.name}
                        </Link>
                        {(course.city || course.state) && (
                          <span className="block text-[13px] tsi-muted">
                            {[course.city, course.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="tsi-col-num">{course.yardage ?? "—"}</td>
                      <td className="tsi-col-num">{course.par ?? "—"}</td>
                      <td className="tsi-col-num">{course.slope ?? "—"}</td>
                      <td className="tsi-col-num">{course.rating?.toFixed(1) ?? "—"}</td>
                      <td>
                        <Link
                          href={`/courses/${course.id}`}
                          className="tsi-rule inline-flex items-center rounded-lg px-3 text-[13px] font-semibold"
                          style={{ minHeight: 36 }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroller>
          )}
        </section>
      </div>
    </>
  );
}
