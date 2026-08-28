import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { parseCheckoutOrderBody } from "@/lib/checkout-validation";
import { parseProductFormConfig } from "@/lib/product-form-config";

const HOLD_MINUTES = 15;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const link = await prisma.checkoutLink.findFirst({
      where: { slug, isActive: true },
      include: { product: true },
    });

    if (!link || !link.product.isActive) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const formConfig = parseProductFormConfig(link.product.formConfig);
    const raw = await req.json();
    const body = parseCheckoutOrderBody(formConfig, raw);
    const holdExpiresAt = addMinutes(new Date(), HOLD_MINUTES);

    const customAnswers: Record<string, string> = {};
    if (body.customAnswers) {
      for (const [k, v] of Object.entries(body.customAnswers)) {
        if (v?.trim()) customAnswers[k] = v.trim();
      }
    }

    const order = await prisma.checkoutOrder.create({
      data: {
        checkoutLinkId: link.id,
        productId: link.product.id,
        status: "PENDING_PAYMENT",
        customerName: body.customerName,
        customerEmail: body.customerEmail?.toLowerCase() ?? "",
        customerPhone: body.customerPhone?.replace(/\D/g, "") ?? "",
        customerCpf: body.customerCpf?.replace(/\D/g, "") || null,
        customAnswers: Object.keys(customAnswers).length
          ? JSON.stringify(customAnswers)
          : null,
        holdExpiresAt,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      holdExpiresAt,
      amountCents: link.product.priceCents,
      productTitle: link.product.title,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 });
  }
}
