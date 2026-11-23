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
import { isTeamMemberRole } from "@/lib/rbac";
import { getRequestProductBrand } from "@/lib/app-origin-server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestProductBrand();
  return {
    title: {
      default: `Painel · ${brand.name}`,
      template: `%s · ${brand.name}`,
    },
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login?next=/app");

  if (session.user.mustChangePassword) {
    redirect("/primeiro-acesso");
  }

  if (session.user.isPlatformAdmin) {
    redirect("/admin");
  }

  if (!session.user.organizationId) redirect("/signup/complete");

  // Equipe de documentos não usa o painel operacional
  if (isTeamMemberRole(session.user.role)) {
    redirect("/intake");
  }

  const orgId = session.user.organizationId;
  const needsProName =
    !session.user.name?.trim() &&
    session.user.role === "PROFESSIONAL" &&
    Boolean(session.user.professionalId);

  const [org, billing, platformCfg, brand, pro] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        logoUrl: true,
        businessMode: true,
        businessProfile: true,
        featureFlags: true,
        onboardingCompletedAt: true,
        attendanceEnabled: true,
      },
    }),
    checkOrgBillingAccess(orgId),
    getPlatformConfig(),
    getRequestProductBrand(),
    needsProName
      ? prisma.professional.findUnique({
          where: { id: session.user.professionalId! },
          select: { displayName: true },
        })
      : Promise.resolve(null),
  ]);

  if (!org?.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  let accountName = session.user.name?.trim() || null;
  if (!accountName && pro?.displayName) {
    accountName = pro.displayName.trim() || null;
  }
  if (!accountName && session.user.email) {
    accountName = session.user.email.split("@")[0] || null;
  }

  if (!billing.allowed) {
    return (
      <div className="admin-shell flex min-h-screen flex-col" data-brand={brand.id}>
        <header className="admin-topbar flex h-14 items-center justify-between border-b border-border px-4 md:px-8">
          <span className="text-sm font-semibold">{brand.name}</span>
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
      userName={accountName}
      role={session.user.role}
      businessMode={org?.businessMode || session.user.businessMode || "SOLO"}
      businessProfile={org?.businessProfile || "SALON"}
      featureFlags={org?.featureFlags}
      attendanceEnabled={Boolean(org?.attendanceEnabled)}
      productBrandId={brand.id}
    >
      {children}
    </AppShell>
  );
}
