import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.organizationId) redirect("/signup/complete");
  return children;
}
