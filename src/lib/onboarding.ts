import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { uniqueBookingPageSlug } from "@/lib/booking-page-slug";

/**
 * Cria a organização e uma agenda vazia (rascunho).
 * Sem serviços e sem horários — o usuário configura no wizard.
 */
export async function provisionOrganization(
  userId: string,
  organizationName: string,
) {
  const base = slugify(organizationName) || `empresa-${Date.now().toString(36)}`;
  let orgSlug = base;

  const taken = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });
  if (taken) {
    let found = false;
    for (let i = 2; i < 100; i++) {
      const candidate = `${base}-${i}`;
      const exists = await prisma.organization.findUnique({
        where: { slug: candidate },
      });
      if (!exists) {
        orgSlug = candidate;
        found = true;
        break;
      }
    }
    if (!found) orgSlug = `${base}-${Date.now().toString(36)}`;
  }

  const organization = await prisma.organization.create({
    data: {
      name: organizationName.trim(),
      slug: orgSlug,
    },
  });

  await prisma.membership.create({
    data: {
      role: "OWNER",
      userId,
      organizationId: organization.id,
    },
  });

  const pageSlug = await uniqueBookingPageSlug(
    organization.id,
    organizationName.trim() || "Minha agenda",
  );

  const page = await prisma.bookingPage.create({
    data: {
      organizationId: organization.id,
      title: organizationName.trim() || "Minha agenda",
      slug: pageSlug,
      description: null,
      accentColor: "#0a0a0a",
    },
  });

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    role: "OWNER" as const,
    bookingPageId: page.id,
    bookingPageSlug: page.slug,
  };
}
