import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForms";
import { PageTitle } from "@/components/ui";
import { currentPlayer, googleEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await currentPlayer()) redirect("/me");
  return (
    <>
      <PageTitle kicker="Turkey Slice Invitational" title="Create a username" />
      <RegisterForm googleEnabled={googleEnabled()} />
    </>
  );
}
