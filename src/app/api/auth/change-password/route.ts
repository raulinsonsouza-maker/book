import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

/** Troca de senha autenticada (primeiro acesso ou voluntária). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({
      where: { id: session.user.id },
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
    console.error("[change-password]", e);
    return NextResponse.json({ error: "Não foi possível salvar" }, { status: 500 });
  }
}
