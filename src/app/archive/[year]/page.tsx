import { redirect } from "next/navigation";

export default async function ArchiveYearRedirect({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  redirect(`/cup/${year}`);
}
