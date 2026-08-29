import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/admin/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.organizationId) redirect("/signup/complete");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true, logoUrl: true, businessMode: true },
  });

  return (
    <AppShell
      organizationName={org?.name || session.user.organizationName}
      organizationLogoUrl={org?.logoUrl}
      userName={session.user.name}
      role={session.user.role}
      businessMode={org?.businessMode || session.user.businessMode || "SOLO"}
    >
      {children}
    </AppShell>
  );
}
