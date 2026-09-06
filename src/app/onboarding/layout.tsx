import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  // Guest onboarding is public. Logged-in users without org go to complete.
  if (session?.user && !session.user.organizationId && !session.user.isPlatformAdmin) {
    redirect("/signup/complete");
  }
  return children;
}
