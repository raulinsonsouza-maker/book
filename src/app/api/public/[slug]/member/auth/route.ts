import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requestCustomerOtp,
  verifyCustomerOtp,
  getCustomerSession,
  clearCustomerSession,
} from "@/lib/customer-auth";

async function resolveOrg(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, accentColor: true, logoUrl: true },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const org = await resolveOrg(slug);
  if (!org) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const customer = await getCustomerSession(org.id);
  return NextResponse.json({
    org,
    customer: customer
      ? { id: customer.id, name: customer.name, phoneE164: customer.phoneE164 }
      : null,
  });
}

const requestSchema = z.object({
  action: z.enum(["request_otp", "verify_otp", "logout"]),
  phone: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const org = await resolveOrg(slug);
  if (!org) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = requestSchema.parse(await req.json());

    if (body.action === "logout") {
      await clearCustomerSession();
      return NextResponse.json({ ok: true });
    }

    if (body.action === "request_otp") {
      if (!body.phone) {
        return NextResponse.json({ error: "Informe o celular" }, { status: 400 });
      }
      const result = await requestCustomerOtp({
        organizationId: org.id,
        phone: body.phone,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (body.action === "verify_otp") {
      if (!body.phone || !body.code) {
        return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });
      }
      const result = await verifyCustomerOtp({
        organizationId: org.id,
        phone: body.phone,
        code: body.code,
        name: body.name,
        email: body.email,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        customer: {
          id: result.customer.id,
          name: result.customer.name,
          phoneE164: result.customer.phoneE164,
        },
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
