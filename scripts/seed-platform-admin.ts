import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "raul@symbius.com.br";
  const password = "Symbius";

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

  await prisma.plan.upsert({
    where: { slug: "essencial" },
    update: {},
    create: {
      id: "plan_essencial",
      name: "Essencial",
      slug: "essencial",
      priceCents: 9900,
      trialDays: 14,
      isActive: true,
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
