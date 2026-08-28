import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { defaultWeekRules } from "@/lib/availability";

export async function provisionOrganization(
  userId: string,
  organizationName: string,
) {
  let orgSlug = slugify(organizationName);
  const slugTaken = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });
  if (slugTaken) orgSlug = `${orgSlug}-${Date.now().toString(36)}`;

  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
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

  const pageSlug = `${orgSlug}-consulta`;
  const page = await prisma.bookingPage.create({
    data: {
      organizationId: organization.id,
      title: "Consultas",
      slug: pageSlug,
      description:
        "Você está a poucos passos de agendar. Escolha a melhor data e hora — o fuso é ajustado automaticamente.",
      accentColor: "#0a0a0a",
      websiteUrl: "https://example.com",
      services: {
        create: {
          title: "Consulta padrão",
          description:
            "Opção ideal para quem precisa de orientação personalizada. Duração de 30 minutos.",
          durationMinutes: 30,
          priceCents: 39000,
          sortOrder: 0,
          customFields: {
            create: [
              {
                label: "Conte brevemente sua situação e necessidades",
                type: "TEXTAREA",
                required: true,
                sortOrder: 0,
              },
            ],
          },
        },
      },
      availability: {
        create: defaultWeekRules(),
      },
    },
  });

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    role: "OWNER" as const,
    bookingPageSlug: page.slug,
  };
}
