import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { defaultWeekRules } from "@/lib/availability";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  organizationName: z.string().min(2),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const email = data.email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "E-mail já cadastrado" },
        { status: 400 },
      );
    }

    let orgSlug = slugify(data.organizationName);
    const slugTaken = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });
    if (slugTaken) orgSlug = `${orgSlug}-${Date.now().toString(36)}`;

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: data.organizationName,
                slug: orgSlug,
              },
            },
          },
        },
      },
      include: { memberships: true },
    });

    const orgId = user.memberships[0].organizationId;

    // Seed a demo booking page so the user can try the funnel immediately
    const pageSlug = `${orgSlug}-consulta`;
    const page = await prisma.bookingPage.create({
      data: {
        organizationId: orgId,
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

    return NextResponse.json({
      ok: true,
      userId: user.id,
      bookingPageSlug: page.slug,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro ao cadastrar" }, { status: 500 });
  }
}
