import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  consumePasswordResetToken,
  hashPasswordToken,
} from "@/lib/password-reset";

const schema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (token.length < 20) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  const tokenHash = hashPasswordToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { expiresAt: true, usedAt: true },
  });
  const valid =
    Boolean(row) && !row!.usedAt && row!.expiresAt.getTime() > Date.now();
  return NextResponse.json({ valid });
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await consumePasswordResetToken(body.token);
    if (!user) {
      return NextResponse.json(
        { error: "Link inválido ou expirado. Solicite um novo." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg =
        e.issues.find((err) => err.path[0] === "confirmPassword")?.message ||
        "Dados inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[reset-password]", e);
    return NextResponse.json({ error: "Não foi possível redefinir" }, { status: 500 });
  }
}
