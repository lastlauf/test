import { redirect } from "next/navigation";
import AuthPanel from "@/components/AuthPanel";
import { currentPlayer, googleEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await currentPlayer()) redirect("/me");
  return <AuthPanel initialMode="create" googleEnabled={googleEnabled()} />;
}
