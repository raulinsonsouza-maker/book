/**
 * Seed idempotente: produto Intake "Abertura de Empresa" para Bruna Aguiar Consultoria.
 * Uso: npx tsx scripts/seed-intake-bruna.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureProductCheckoutLink } from "../src/lib/checkout-slug";
import { serializeNotifyEmails } from "../src/lib/intake/notify-emails";

const ORG_NAMES = ["Bruna Aguiar Consultoria", "Bruna Aguiar"];
const NOTIFY_EMAIL = "legalizacaovenx@gmail.com";
const PRODUCT_TITLE = "Abertura de Empresa";
const PRICE_CENTS = 200_000;
const SERVICE_TITLE = "Abertura de Empresa";

async function main() {
  const org = await prisma.organization.findFirst({
    where: {
      OR: ORG_NAMES.map((name) => ({ name: { contains: name } })),
    },
    include: {
      bookingPages: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!org) {
    console.error("Organização Bruna Aguiar não encontrada.");
    process.exit(1);
  }

  let product = await prisma.product.findFirst({
    where: {
      organizationId: org.id,
      title: PRODUCT_TITLE,
    },
  });

  if (product) {
    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        description:
          "Abertura de empresa com coleta de dados dos sócios e documentos. Após o pagamento, nossa equipe dará continuidade ao processo.",
        priceCents: PRICE_CENTS,
        productKind: "INTAKE",
        intakeTemplateKey: "company_opening_br",
        notifyEmails: serializeNotifyEmails([NOTIFY_EMAIL]),
        intakeEmailAlerts: true,
        isActive: true,
      },
    });
    console.log("Produto atualizado:", product.id);
  } else {
    product = await prisma.product.create({
      data: {
        organizationId: org.id,
        title: PRODUCT_TITLE,
        description:
          "Abertura de empresa com coleta de dados dos sócios e documentos. Após o pagamento, nossa equipe dará continuidade ao processo.",
        priceCents: PRICE_CENTS,
        productKind: "INTAKE",
        intakeTemplateKey: "company_opening_br",
        notifyEmails: serializeNotifyEmails([NOTIFY_EMAIL]),
        intakeEmailAlerts: true,
        isActive: true,
      },
    });
    console.log("Produto criado:", product.id);
  }

  const link = await ensureProductCheckoutLink(product.id, PRODUCT_TITLE);
  await prisma.checkoutLink.update({
    where: { id: link.id },
    data: { isActive: true },
  });

  const page = org.bookingPages[0];
  if (page) {
    const existingService = await prisma.service.findFirst({
      where: { bookingPageId: page.id, intakeProductId: product.id },
    });
    if (existingService) {
      await prisma.service.update({
        where: { id: existingService.id },
        data: {
          title: SERVICE_TITLE,
          description: product.description,
          priceCents: PRICE_CENTS,
          isActive: true,
          intakeProductId: product.id,
        },
      });
      console.log("Serviço atualizado:", existingService.id);
    } else {
      const maxSort = await prisma.service.aggregate({
        where: { bookingPageId: page.id },
        _max: { sortOrder: true },
      });
      const service = await prisma.service.create({
        data: {
          bookingPageId: page.id,
          title: SERVICE_TITLE,
          description: product.description,
          priceCents: PRICE_CENTS,
          durationMinutes: 0,
          intakeProductId: product.id,
          isActive: true,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        },
      });
      console.log("Serviço criado:", service.id);
    }
  } else {
    console.warn("Nenhuma booking page ativa — serviço no agendador não vinculado.");
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      intakeNotifyEmails: serializeNotifyEmails([NOTIFY_EMAIL]),
      intakeEmailAlerts: true,
    },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://book.symbius.com.br").replace(
    /\/$/,
    "",
  );
  console.log("\n--- URLs ---");
  console.log("Checkout:", `${appUrl}/pay/${link.slug}`);
  if (page) {
    console.log(
      "Agendador:",
      `${appUrl}/p/${org.slug}/${page.slug}`,
    );
  }
  console.log("Painel intake:", `${appUrl}/app/intake`);
  console.log("E-mail equipe:", NOTIFY_EMAIL);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
