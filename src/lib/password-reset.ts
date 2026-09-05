import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

export function hashPasswordToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function generatePasswordResetRawToken() {
  return randomBytes(32).toString("hex");
}

/** Cria token de reset e invalida tokens anteriores não usados. */
export async function issuePasswordResetToken(userId: string) {
  const raw = generatePasswordResetRawToken();
  const tokenHash = hashPasswordToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);

  return { raw, expiresAt };
}

export async function consumePasswordResetToken(raw: string) {
  const tokenHash = hashPasswordToken(raw);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, disabledAt: true } } },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return null;
  }
  if (row.user.disabledAt) return null;

  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  return row.user;
}
