import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  canAccessIntake,
  isFullAdminRole,
} from "@/lib/rbac";
import { postLoginPath } from "@/lib/auth-routes";
import { IntakeShell } from "@/components/intake/IntakeShell";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { SubscriptionBlocked } from "@/components/billing/SubscriptionBlocked";
import {
  checkOrgBillingAccess,
  getPlatformConfig,
} from "@/lib/billing/platform";

export default async function IntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login?next=/intake");

  if (session.user.mustChangePassword) {
    redirect("/primeiro-acesso");
  }

  if (session.user.isPlatformAdmin) {
    redirect("/admin");
  }

  if (!session.user.organizationId) redirect("/signup/complete");

  if (!canAccessIntake(session.user.role)) {
    redirect(postLoginPath(session.user));
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      name: true,
      logoUrl: true,
      onboardingCompletedAt: true,
    },
  });

  if (!org?.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  let accountName = session.user.name?.trim() || null;
  if (!accountName && session.user.email) {
    accountName = session.user.email.split("@")[0] || null;
  }

  const billing = await checkOrgBillingAccess(session.user.organizationId);
  const platformCfg = await getPlatformConfig();

  if (!billing.allowed) {
    return (
      <div className="admin-shell flex min-h-screen flex-col">
        <header className="admin-topbar flex h-14 items-center justify-between border-b border-border px-4 md:px-8">
          <span className="text-sm font-semibold">Book Symbius · Intake</span>
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
    <IntakeShell
      organizationName={org?.name || session.user.organizationName}
      organizationLogoUrl={org?.logoUrl}
      userName={accountName}
      showAppLink={isFullAdminRole(session.user.role)}
    >
      {children}
    </IntakeShell>
  );
}
