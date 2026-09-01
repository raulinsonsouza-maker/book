import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { mergeIntakeData } from "@/lib/intake/merge-data";
import { getIntakeTemplate } from "@/lib/intake/templates";
import {
  validateFullIntakeData,
  validateIntakeStep,
  primaryContactFromData,
  parseIntakeData,
} from "@/lib/intake/validation/company-opening-br";
import { missingRequiredFiles } from "@/lib/intake/required-files";
import {
  loadIntakeCheckoutLink,
  loadIntakeOrder,
  ensureIntakeOrderHold,
} from "@/lib/intake/access";
import type { CompanyOpeningBrData } from "@/lib/intake/types";

export const runtime = "nodejs";

const HOLD_MINUTES = 15;

const bodySchema = z.object({
  orderId: z.string().optional(),
  stepId: z.string().optional(),
  data: z.unknown(),
  submit: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
  }

  const order = await loadIntakeOrder(orderId, slug);
  if (!order?.intakeSubmission) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const data = parseIntakeData(order.intakeSubmission.data);
  const attachments = order.intakeSubmission.attachments.map((a) => ({
    id: a.id,
    fieldKey: a.fieldKey,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    partnerIndex: a.partnerIndex,
  }));

  return NextResponse.json({
    orderId: order.id,
    submissionId: order.intakeSubmission.id,
    status: order.intakeSubmission.status,
    data,
    attachments,
    holdExpiresAt: order.holdExpiresAt,
    orderStatus: order.status,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const link = await loadIntakeCheckoutLink(slug);
    if (!link || !link.product.isActive) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    if (link.product.productKind !== "INTAKE") {
      return NextResponse.json({ error: "Produto não é intake" }, { status: 400 });
    }

    const templateKey = link.product.intakeTemplateKey;
    const template = getIntakeTemplate(templateKey);
    if (!template) {
      return NextResponse.json({ error: "Template inválido" }, { status: 500 });
    }

    const body = bodySchema.parse(await req.json());
    const incoming = body.data as Partial<CompanyOpeningBrData>;
    const merged = mergeIntakeData(template.defaultData(), incoming);

    if (body.stepId && body.stepId !== "documents" && body.stepId !== "payment") {
      const stepCheck = validateIntakeStep(body.stepId, merged);
      if (!stepCheck.ok) {
        return NextResponse.json({ error: stepCheck.message }, { status: 400 });
      }
    }

    let orderId = body.orderId;
    let submissionId: string;

    if (orderId) {
      const existing = await loadIntakeOrder(orderId, slug);
      if (!existing?.intakeSubmission) {
        return NextResponse.json({ error: "Pedido inválido" }, { status: 404 });
      }
      if (existing.status !== "PENDING_PAYMENT") {
        return NextResponse.json({ error: "Pedido já finalizado" }, { status: 409 });
      }

      await prisma.intakeSubmission.update({
        where: { id: existing.intakeSubmission.id },
        data: { data: JSON.stringify(merged) },
      });
      submissionId = existing.intakeSubmission.id;
      await ensureIntakeOrderHold(orderId, slug);

      const contact = primaryContactFromData(merged);
      await prisma.checkoutOrder.update({
        where: { id: orderId },
        data: {
          customerName: contact.customerName || existing.customerName,
          customerEmail: contact.customerEmail?.toLowerCase() || existing.customerEmail,
          customerPhone: contact.customerPhone || existing.customerPhone,
          customerCpf: contact.customerCpf || existing.customerCpf,
        },
      });
    } else {
      const fullCheck = validateFullIntakeData(merged);
      if (!fullCheck.ok && body.submit) {
        return NextResponse.json({ error: fullCheck.message }, { status: 400 });
      }

      const contact = primaryContactFromData(
        fullCheck.ok ? fullCheck.data : merged,
      );

      const holdExpiresAt = addMinutes(new Date(), HOLD_MINUTES);
      const order = await prisma.checkoutOrder.create({
        data: {
          checkoutLinkId: link.id,
          productId: link.product.id,
          status: "PENDING_PAYMENT",
          customerName: contact.customerName || "Cliente",
          customerEmail: contact.customerEmail?.toLowerCase() || "",
          customerPhone: contact.customerPhone || "",
          customerCpf: contact.customerCpf || null,
          holdExpiresAt,
          intakeSubmission: {
            create: {
              organizationId: link.product.organizationId,
              templateKey: template.key,
              status: "DRAFT",
              data: JSON.stringify(merged),
            },
          },
        },
        include: { intakeSubmission: true },
      });
      orderId = order.id;
      submissionId = order.intakeSubmission!.id;
    }

    if (body.submit) {
      const order = await loadIntakeOrder(orderId!, slug);
      if (!order?.intakeSubmission) {
        return NextResponse.json({ error: "Pedido inválido" }, { status: 404 });
      }

      const data = parseIntakeData(order.intakeSubmission.data);
      if (!data) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
      }

      const fullCheck = validateFullIntakeData(data);
      if (!fullCheck.ok) {
        return NextResponse.json({ error: fullCheck.message }, { status: 400 });
      }

      const uploaded = new Set(
        order.intakeSubmission.attachments.map((a) => a.fieldKey),
      );
      const missing = missingRequiredFiles(fullCheck.data, uploaded);
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `Faltam documentos: ${missing.map((m) => m.label).join(", ")}`,
            missing: missing.map((m) => m.key),
          },
          { status: 400 },
        );
      }

      const contact = primaryContactFromData(fullCheck.data);
      await prisma.$transaction([
        prisma.intakeSubmission.update({
          where: { id: order.intakeSubmission.id },
          data: { status: "SUBMITTED", submittedAt: new Date() },
        }),
        prisma.checkoutOrder.update({
          where: { id: order.id },
          data: {
            customerName: contact.customerName || order.customerName,
            customerEmail: contact.customerEmail?.toLowerCase() || order.customerEmail,
            customerPhone: contact.customerPhone || order.customerPhone,
            customerCpf: contact.customerCpf || order.customerCpf,
          },
        }),
      ]);
    }

    const refreshed = await loadIntakeOrder(orderId!, slug);
    return NextResponse.json({
      orderId,
      submissionId,
      status: refreshed?.intakeSubmission?.status || "DRAFT",
      holdExpiresAt: refreshed?.holdExpiresAt,
      amountCents: link.product.priceCents,
      productTitle: link.product.title,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    console.error("[intake]", code, e);
    if (code === "P1008" || code === "P2034") {
      return NextResponse.json(
        { error: "Banco ocupado — tente novamente em instantes" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Erro ao salvar intake" }, { status: 500 });
  }
}
