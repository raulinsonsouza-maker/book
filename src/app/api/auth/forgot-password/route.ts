import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordReset } from "@/lib/email";
import { appUrl } from "@/lib/email/templates/layout";
import { issuePasswordResetToken } from "@/lib/password-reset";

const schema = z.object({
  email: z.string().email(),
});

/**
 * Sempre responde sucesso (não revela se o e-mail existe).
 * Só envia se houver usuário ativo com senha (login por credentials).
 */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        disabledAt: true,
      },
    });

    if (user && user.passwordHash && !user.disabledAt) {
      const { raw } = await issuePasswordResetToken(user.id);
      const resetUrl = appUrl(`/redefinir-senha?token=${encodeURIComponent(raw)}`);
      await sendPasswordReset({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Informe um e-mail válido" }, { status: 400 });
    }
    console.error("[forgot-password]", e);
    return NextResponse.json({ error: "Não foi possível processar" }, { status: 500 });
  }
}
