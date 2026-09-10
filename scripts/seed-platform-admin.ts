import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "raul@symbius.com.br";
  const password = "Symbius@2026";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Raul",
      passwordHash,
      isPlatformAdmin: true,
      disabledAt: null,
    },
    create: {
      name: "Raul",
      email,
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  await prisma.platformConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      defaultTrialDays: 14,
      supportEmail: "suporte@symbius.com.br",
    },
  });

  // Legacy single plan → deactivate (replaced by mensal/semestral)
  await prisma.plan.updateMany({
    where: { slug: "essencial" },
    data: { isActive: false },
  });

  await prisma.plan.upsert({
    where: { slug: "essencial-mensal" },
    update: {
      name: "Essencial Mensal",
      priceCents: 9700,
      interval: "MONTH",
      trialDays: 0,
      isActive: true,
      whatsappQuotaMonthly: 600,
    },
    create: {
      name: "Essencial Mensal",
      slug: "essencial-mensal",
      priceCents: 9700,
      interval: "MONTH",
      trialDays: 0,
      isActive: true,
      whatsappQuotaMonthly: 600,
    },
  });

  await prisma.plan.upsert({
    where: { slug: "essencial-semestral" },
    update: {
      name: "Essencial Semestral",
      priceCents: 40200,
      interval: "SEMESTER",
      trialDays: 0,
      isActive: true,
      whatsappQuotaMonthly: 600,
    },
    create: {
      name: "Essencial Semestral",
      slug: "essencial-semestral",
      priceCents: 40200,
      interval: "SEMESTER",
      trialDays: 0,
      isActive: true,
      whatsappQuotaMonthly: 600,
    },
  });

  await prisma.platformWhatsAppConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      enabled: false,
      templateOtpName: "book_auth_otp",
      templateReminderName: "book_booking_reminder",
    },
  });

  console.log("Platform admin seed OK:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
