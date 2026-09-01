import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIntakeTemplate } from "@/lib/intake/templates";
import {
  deleteIntakeFile,
  mimeToExt,
  saveIntakeFile,
} from "@/lib/intake/storage";
import { loadIntakeOrder, orderHoldExpired } from "@/lib/intake/access";
import { parseIntakeData } from "@/lib/intake/validation/company-opening-br";
import { requiredIntakeFileFields } from "@/lib/intake/required-files";

export const runtime = "nodejs";

function partnerIndexFromKey(fieldKey: string): number | null {
  const m = /^partner_(\d+)_/.exec(fieldKey);
  return m ? Number(m[1]) : null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const form = await req.formData();
    const orderId = String(form.get("orderId") || "");
    const fieldKey = String(form.get("fieldKey") || "");
    const file = form.get("file");

    if (!orderId || !fieldKey) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Envie um arquivo" }, { status: 400 });
    }

    const order = await loadIntakeOrder(orderId, slug);
    if (!order?.intakeSubmission) {
      return NextResponse.json({ error: "Pedido inválido" }, { status: 404 });
    }
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: "Pedido já finalizado" }, { status: 409 });
    }
    if (orderHoldExpired(order)) {
      return NextResponse.json({ error: "Tempo expirado" }, { status: 410 });
    }

    const template = getIntakeTemplate(order.product.intakeTemplateKey);
    if (!template) {
      return NextResponse.json({ error: "Template inválido" }, { status: 500 });
    }

    const data = parseIntakeData(order.intakeSubmission.data);
    if (!data) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const allowedKeys = new Set(requiredIntakeFileFields(data).map((f) => f.key));
    if (!allowedKeys.has(fieldKey)) {
      return NextResponse.json({ error: "Campo de upload inválido" }, { status: 400 });
    }

    if (!template.allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato não aceito — use PDF, JPG ou PNG" },
        { status: 400 },
      );
    }
    if (file.size > template.maxFileBytes) {
      return NextResponse.json(
        { error: `Arquivo muito grande — máximo ${Math.round(template.maxFileBytes / 1024 / 1024)} MB` },
        { status: 400 },
      );
    }

    const ext = mimeToExt(file.type);
    if (!ext) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const saved = await saveIntakeFile({
      orgId: order.product.organizationId,
      submissionId: order.intakeSubmission.id,
      fieldKey,
      buffer: buf,
      ext,
    });

    const existing = await prisma.intakeAttachment.findUnique({
      where: {
        intakeSubmissionId_fieldKey: {
          intakeSubmissionId: order.intakeSubmission.id,
          fieldKey,
        },
      },
    });
    if (existing) {
      await deleteIntakeFile(existing.storagePath);
      await prisma.intakeAttachment.delete({ where: { id: existing.id } });
    }

    const attachment = await prisma.intakeAttachment.create({
      data: {
        intakeSubmissionId: order.intakeSubmission.id,
        fieldKey,
        partnerIndex: partnerIndexFromKey(fieldKey),
        fileName: file.name || saved.fileName,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath: saved.storagePath,
      },
    });

    return NextResponse.json({
      id: attachment.id,
      fieldKey: attachment.fieldKey,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      partnerIndex: attachment.partnerIndex,
    });
  } catch (e) {
    console.error("[intake/upload]", e);
    return NextResponse.json({ error: "Erro no upload" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const fieldKey = searchParams.get("fieldKey");

  if (!orderId || !fieldKey) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const order = await loadIntakeOrder(orderId, slug);
  if (!order?.intakeSubmission) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 404 });
  }
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "Pedido já finalizado" }, { status: 409 });
  }

  const attachment = await prisma.intakeAttachment.findUnique({
    where: {
      intakeSubmissionId_fieldKey: {
        intakeSubmissionId: order.intakeSubmission.id,
        fieldKey,
      },
    },
  });
  if (!attachment) {
    return NextResponse.json({ ok: true });
  }

  await deleteIntakeFile(attachment.storagePath);
  await prisma.intakeAttachment.delete({ where: { id: attachment.id } });

  if (order.intakeSubmission.status === "SUBMITTED") {
    await prisma.intakeSubmission.update({
      where: { id: order.intakeSubmission.id },
      data: { status: "DRAFT", submittedAt: null },
    });
  }

  return NextResponse.json({ ok: true });
}
