import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const productId = searchParams.get("productId");
  const q = searchParams.get("q")?.trim();

  const submissions = await prisma.intakeSubmission.findMany({
    where: {
      organizationId: auth.ctx.organizationId,
      ...(status ? { status: status as "DRAFT" | "SUBMITTED" | "PAID" } : {}),
      ...(productId
        ? { checkoutOrder: { productId } }
        : {}),
      ...(q
        ? {
            OR: [
              { checkoutOrder: { customerName: { contains: q } } },
              { checkoutOrder: { customerEmail: { contains: q } } },
              { checkoutOrder: { customerPhone: { contains: q } } },
            ],
          }
        : {}),
    },
    include: {
      checkoutOrder: {
        include: {
          product: { select: { id: true, title: true, priceCents: true } },
          payment: { select: { status: true, method: true, paidAt: true } },
        },
      },
      _count: { select: { attachments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    submissions.map((s) => ({
      id: s.id,
      templateKey: s.templateKey,
      status: s.status,
      reviewStatus: s.reviewStatus,
      submittedAt: s.submittedAt,
      viewedAt: s.viewedAt,
      createdAt: s.createdAt,
      attachmentCount: s._count.attachments,
      order: {
        id: s.checkoutOrder.id,
        status: s.checkoutOrder.status,
        customerName: s.checkoutOrder.customerName,
        customerEmail: s.checkoutOrder.customerEmail,
        customerPhone: s.checkoutOrder.customerPhone,
        paidAt: s.checkoutOrder.paidAt,
        product: s.checkoutOrder.product,
        payment: s.checkoutOrder.payment,
      },
    })),
  );
}
