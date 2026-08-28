import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CheckoutOrderStatus } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as CheckoutOrderStatus | null;
  const productId = searchParams.get("productId");
  const q = searchParams.get("q")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    product: { organizationId: session.user.organizationId },
    ...(status ? { status } : {}),
    ...(productId ? { productId } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q } },
            { customerEmail: { contains: q } },
          ],
        }
      : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const orders = await prisma.checkoutOrder.findMany({
    where,
    include: {
      product: { select: { id: true, title: true, priceCents: true } },
      checkoutLink: { select: { id: true, slug: true, title: true } },
      payment: {
        select: {
          id: true,
          status: true,
          method: true,
          amountCents: true,
          paidAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(orders);
}
