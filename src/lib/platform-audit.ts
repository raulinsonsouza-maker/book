import { prisma } from "@/lib/prisma";

export async function writePlatformAudit(input: {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.platformAuditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (e) {
    console.error("[platform-audit]", e);
  }
}
