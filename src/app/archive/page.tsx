import { redirect } from "next/navigation";

/** The archive grew into the record book; tournaments live under /cup now. */
export default function ArchiveRedirect() {
  redirect("/cup");
}
