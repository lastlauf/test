import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { PageTitle } from "@/components/ui";
import { currentPlayer, googleEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentPlayer()) redirect("/me");
  return (
    <>
      <PageTitle kicker="Turkey Slice Invitational" title="Sign in" />
      <LoginForm googleEnabled={googleEnabled()} />
    </>
  );
}
