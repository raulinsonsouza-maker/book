import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/admin/AppShell";
import { SubscriptionBlocked } from "@/components/billing/SubscriptionBlocked";
import { SignOutButton } from "@/components/admin/SignOutButton";
import {
  checkOrgBillingAccess,
  getPlatformConfig,
} from "@/lib/billing/platform";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  if (session.user.isPlatformAdmin) {
    redirect("/gerencial");
  }

  if (!session.user.organizationId) redirect("/signup/complete");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      name: true,
      logoUrl: true,
      businessMode: true,
      onboardingCompletedAt: true,
    },
  });

  if (!org?.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const billing = await checkOrgBillingAccess(session.user.organizationId);
  const platformCfg = await getPlatformConfig();

  if (!billing.allowed) {
    return (
      <div className="admin-shell flex min-h-screen flex-col">
        <header className="admin-topbar flex h-14 items-center justify-between border-b border-border px-4 md:px-8">
          <span className="text-sm font-semibold">Book Symbius</span>
          <SignOutButton />
        </header>
        <main className="admin-main flex-1 p-4 md:p-6 lg:p-8">
          <SubscriptionBlocked
            reason={platformCfg.billingBlockMessage?.trim() || billing.reason}
            supportEmail={platformCfg.supportEmail}
          />
        </main>
      </div>
    );
  }

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
