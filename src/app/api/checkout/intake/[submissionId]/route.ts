import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";
import { parseIntakeData } from "@/lib/intake/validation/company-opening-br";
import { fileFieldLabel } from "@/lib/intake/required-files";
import { sendIntakeAlertToTeam } from "@/lib/email";

async function loadOwnedSubmission(submissionId: string, organizationId: string) {
  return prisma.intakeSubmission.findFirst({
    where: { id: submissionId, organizationId },
    include: {
      attachments: true,
      checkoutOrder: {
        include: {
          product: true,
          payment: true,
          checkoutLink: true,
        },
      },
      organization: true,
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const { submissionId } = await params;
  const submission = await loadOwnedSubmission(
    submissionId,
    auth.ctx.organizationId,
  );
  if (!submission) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  if (!submission.viewedAt) {
    await prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: { viewedAt: new Date(), reviewStatus: "IN_REVIEW" },
    });
  }

  const data = parseIntakeData(submission.data);

  return NextResponse.json({
    id: submission.id,
    templateKey: submission.templateKey,
    status: submission.status,
    reviewStatus: submission.reviewStatus,
    submittedAt: submission.submittedAt,
    viewedAt: submission.viewedAt,
    createdAt: submission.createdAt,
    data,
    attachments: submission.attachments.map((a) => ({
      id: a.id,
      fieldKey: a.fieldKey,
      label: data ? fileFieldLabel(a.fieldKey, data) : a.fieldKey,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      partnerIndex: a.partnerIndex,
    })),
    order: {
      id: submission.checkoutOrder.id,
      status: submission.checkoutOrder.status,
      customerName: submission.checkoutOrder.customerName,
      customerEmail: submission.checkoutOrder.customerEmail,
      customerPhone: submission.checkoutOrder.customerPhone,
      customerCpf: submission.checkoutOrder.customerCpf,
      paidAt: submission.checkoutOrder.paidAt,
      createdAt: submission.checkoutOrder.createdAt,
      product: submission.checkoutOrder.product,
      payment: submission.checkoutOrder.payment,
      checkoutSlug: submission.checkoutOrder.checkoutLink.slug,
    },
  });
}

const patchSchema = z.object({
  reviewStatus: z.enum(["NEW", "IN_REVIEW", "COMPLETED"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const { submissionId } = await params;
  const existing = await loadOwnedSubmission(
    submissionId,
    auth.ctx.organizationId,
  );
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    const body = patchSchema.parse(await req.json());
    const updated = await prisma.intakeSubmission.update({
      where: { id: submissionId },
      data: {
        ...(body.reviewStatus ? { reviewStatus: body.reviewStatus } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const { submissionId } = await params;
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const submission = await loadOwnedSubmission(
    submissionId,
    auth.ctx.organizationId,
  );
  if (!submission) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  if (action === "resend-alert") {
    if (submission.status !== "PAID") {
      return NextResponse.json(
        { error: "Só pedidos pagos recebem aviso" },
        { status: 400 },
      );
    }
    const data = parseIntakeData(submission.data);
    await sendIntakeAlertToTeam({
      submissionId: submission.id,
      productTitle: submission.checkoutOrder.product.title,
      customerName: submission.checkoutOrder.customerName,
      customerEmail: submission.checkoutOrder.customerEmail,
      customerPhone: submission.checkoutOrder.customerPhone,
      priceCents: submission.checkoutOrder.product.priceCents,
      partnerCount: data?.partners.length ?? 0,
      tradeName: data?.tradeName,
      paidAt: submission.checkoutOrder.paidAt || new Date(),
      organizationId: submission.organizationId,
      productNotifyEmails: submission.checkoutOrder.product.notifyEmails,
      productAlertsEnabled: submission.checkoutOrder.product.intakeEmailAlerts,
      orgNotifyEmails: submission.organization.intakeNotifyEmails,
      orgAlertsEnabled: submission.organization.intakeEmailAlerts,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
