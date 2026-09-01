import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiRequireFullAdmin } from "@/lib/rbac";

const TEAM_ROLES = ["MEMBER", "ADMIN"] as const;

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function GET() {
  const auth = await apiRequireFullAdmin();
  if ("error" in auth) return auth.error;

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: auth.ctx.organizationId,
      role: { in: [...TEAM_ROLES] },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          disabledAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    memberships.map((m) => ({
      id: m.id,
      role: m.role,
      name: m.user.name,
      email: m.user.email,
      isActive: m.user.disabledAt === null,
      createdAt: m.createdAt,
    })),
  );
}

export async function POST(req: Request) {
  const auth = await apiRequireFullAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = createSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const membership = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: body.name,
          passwordHash,
        },
      });

      return tx.membership.create({
        data: {
          role: "MEMBER",
          userId: user.id,
          organizationId: auth.ctx.organizationId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              disabledAt: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        id: membership.id,
        role: membership.role,
        name: membership.user.name,
        email: membership.user.email,
        isActive: true,
        createdAt: membership.createdAt,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar membro" }, { status: 500 });
  }
}
