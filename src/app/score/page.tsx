import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Scorecards live at /score/<match>; the list of things to score is /games. */
export default function ScoreIndexPage() {
  redirect("/games");
}
