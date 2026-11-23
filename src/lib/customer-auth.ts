import { createHash, randomBytes, randomInt } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { toE164 } from "@/lib/whatsapp/phone";
import { getPlatformWhatsAppConfig } from "@/lib/whatsapp/config";
import { sendWhatsAppOtp } from "@/lib/whatsapp/client";

const COOKIE = "book_customer_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function upsertCustomer(input: {
  organizationId: string;
  phone: string;
  name?: string;
  email?: string | null;
  cpf?: string | null;
}) {
  const phoneE164 = toE164(input.phone);
  if (!phoneE164) throw new Error("Telefone inválido");
  const cpfDigits = input.cpf?.replace(/\D/g, "") || null;
  const email = input.email?.trim().toLowerCase() || null;
  const name = input.name?.trim() || "Cliente";

  const byPhone = await prisma.customer.findUnique({
    where: {
      organizationId_phoneE164: {
        organizationId: input.organizationId,
        phoneE164,
      },
    },
  });
  if (byPhone) {
    return prisma.customer.update({
      where: { id: byPhone.id },
      data: {
        ...(input.name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(cpfDigits ? { cpf: cpfDigits } : {}),
      },
    });
  }

  if (email) {
    const byEmail = await prisma.customer.findFirst({
      where: {
        organizationId: input.organizationId,
        email: { equals: email },
        ...(input.name
          ? { name: { equals: name } }
          : {}),
      },
    });
    const fallback =
      byEmail ||
      (await prisma.customer.findFirst({
        where: {
          organizationId: input.organizationId,
          email: { equals: email },
        },
      }));
    if (fallback) {
      const phoneTaken = await prisma.customer.findUnique({
        where: {
          organizationId_phoneE164: {
            organizationId: input.organizationId,
            phoneE164,
          },
        },
        select: { id: true },
      });
      return prisma.customer.update({
        where: { id: fallback.id },
        data: {
          ...(input.name ? { name } : {}),
          email,
          ...(cpfDigits ? { cpf: cpfDigits } : {}),
          ...(!phoneTaken ? { phoneE164 } : {}),
        },
      });
    }
  }

  return prisma.customer.create({
    data: {
      organizationId: input.organizationId,
      phoneE164,
      name,
      email,
      cpf: cpfDigits,
    },
  });
}

export async function requestCustomerOtp(input: {
  organizationId: string;
  phone: string;
}) {
  const phoneE164 = toE164(input.phone);
  if (!phoneE164) {
    return { ok: false as const, error: "Telefone inválido" };
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpChallenge.create({
    data: {
      organizationId: input.organizationId,
      phoneE164,
      codeHash: hashCode(code),
      expiresAt,
    },
  });

  const cfg = await getPlatformWhatsAppConfig();
  let channel: "whatsapp" | "dev" = "dev";

  if (cfg.enabled && cfg.accessToken) {
    const sent = await sendWhatsAppOtp({
      toE164: phoneE164,
      code,
      organizationId: input.organizationId,
    });
    if (sent.ok) channel = "whatsapp";
  }

  if (channel === "dev") {
    console.info(`[otp:dev] ${phoneE164} => ${code}`);
  }

  return {
    ok: true as const,
    channel,
    debugCode:
      process.env.NODE_ENV !== "production" || channel === "dev"
        ? code
        : undefined,
  };
}

export async function verifyCustomerOtp(input: {
  organizationId: string;
  phone: string;
  code: string;
  name?: string;
  email?: string;
}) {
  const phoneE164 = toE164(input.phone);
  if (!phoneE164) {
    return { ok: false as const, error: "Telefone inválido" };
  }

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      organizationId: input.organizationId,
      phoneE164,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false as const, error: "Código expirado. Peça outro." };
  }
  if (challenge.attempts >= 5) {
    return { ok: false as const, error: "Muitas tentativas. Peça outro código." };
  }

  if (challenge.codeHash !== hashCode(input.code.trim())) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: "Código inválido" };
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  const customer = await upsertCustomer({
    organizationId: input.organizationId,
    phone: phoneE164,
    name: input.name,
    email: input.email,
  });

  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.customerSession.create({
    data: {
      customerId: customer.id,
      tokenHash: hashToken(raw),
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { ok: true as const, customer };
}

export async function getCustomerSession(organizationId: string) {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { customer: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.customer.organizationId !== organizationId) return null;
  return session.customer;
}

export async function clearCustomerSession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) {
    await prisma.customerSession.deleteMany({
      where: { tokenHash: hashToken(raw) },
    });
  }
  jar.delete(COOKIE);
}

export { COOKIE as CUSTOMER_SESSION_COOKIE };
