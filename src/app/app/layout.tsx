import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/admin/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.organizationId) redirect("/signup/complete");

  return (
    <AppShell
      organizationName={session.user.organizationName}
      userName={session.user.name}
    >
      {children}
    </AppShell>
  );
}
