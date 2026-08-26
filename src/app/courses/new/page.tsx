import { redirect } from "next/navigation";
import { CourseForm } from "@/components/CourseForm";
import { PageTitle, Panel } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  if (!(await currentPlayer())) redirect("/login");

  return (
    <>
      <PageTitle kicker="Courses" title="Add a course" />
      <Panel>
        <CourseForm />
      </Panel>
    </>
  );
}
