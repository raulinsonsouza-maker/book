import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiRequireFullAdmin } from "@/lib/rbac";

const TEAM_ROLES = ["MEMBER", "ADMIN"] as const;

async function getTeamMembership(membershipId: string, organizationId: string) {
  return prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
      role: { in: [...TEAM_ROLES] },
    },
    include: {
      user: true,
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const auth = await apiRequireFullAdmin();
  if ("error" in auth) return auth.error;
  const { membershipId } = await params;

  const membership = await getTeamMembership(
    membershipId,
    auth.ctx.organizationId,
  );
  if (!membership) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }

  try {
    const body = patchSchema.parse(await req.json());

    if (body.email) {
      const email = body.email.toLowerCase().trim();
      const clash = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: membership.userId },
        },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Já existe uma conta com este e-mail." },
          { status: 409 },
        );
      }
      await prisma.user.update({
        where: { id: membership.userId },
        data: { email },
      });
    }

    if (body.name) {
      await prisma.user.update({
        where: { id: membership.userId },
        data: { name: body.name },
      });
    }

    if (body.password) {
      await prisma.user.update({
        where: { id: membership.userId },
        data: { passwordHash: await bcrypt.hash(body.password, 10) },
      });
    }

    if (body.isActive !== undefined) {
      await prisma.user.update({
        where: { id: membership.userId },
        data: { disabledAt: body.isActive ? null : new Date() },
      });
    }

    const updated = await getTeamMembership(
      membershipId,
      auth.ctx.organizationId,
    );

    return NextResponse.json({
      id: updated!.id,
      role: updated!.role,
      name: updated!.user.name,
      email: updated!.user.email,
      isActive: updated!.user.disabledAt === null,
      createdAt: updated!.createdAt,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const auth = await apiRequireFullAdmin();
  if ("error" in auth) return auth.error;
  const { membershipId } = await params;

  const membership = await getTeamMembership(
    membershipId,
    auth.ctx.organizationId,
  );
  if (!membership) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }

  const userId = membership.userId;
  const otherMemberships = await prisma.membership.count({
    where: { userId, NOT: { id: membershipId } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membershipId } });
    if (otherMemberships === 0) {
      await tx.user.delete({ where: { id: userId } });
    }
  });

  return NextResponse.json({ ok: true, deleted: true });
}
