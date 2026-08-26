import { notFound, redirect } from "next/navigation";
import { CourseForm } from "@/components/CourseForm";
import { PageTitle, Panel } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { getCourseDetail } from "@/lib/cup";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await currentPlayer())) redirect("/login");
  const detail = await getCourseDetail(id);
  if (!detail) notFound();

  const main = detail.tees[0] ?? null;

  return (
    <>
      <PageTitle kicker="Courses" title={`Edit ${detail.course.name}`} />
      <Panel>
        <CourseForm
          courseId={id}
          initial={{
            name: detail.course.name,
            city: detail.course.city ?? "",
            state: detail.course.state ?? "",
            yardage: main?.yardage != null ? String(main.yardage) : "",
            slope: main?.slope != null ? String(main.slope) : "113",
            rating: main?.rating != null ? main.rating.toFixed(1) : "72.0",
          }}
        />
      </Panel>
    </>
  );
}
