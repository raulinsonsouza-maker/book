import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = url.searchParams.get("status")?.trim() || "";
  const orgId = url.searchParams.get("organizationId")?.trim() || "";
  const from = url.searchParams.get("from")?.trim();
  const to = url.searchParams.get("to")?.trim();
  const format = url.searchParams.get("format")?.trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const take = Math.min(200, Math.max(10, parseInt(url.searchParams.get("take") || "50", 10)));
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orgId) where.organizationId = orgId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { description: { contains: q } },
      { mpPaymentId: { contains: q } },
      { organization: { name: { contains: q } } },
    ];
  }

  if (format === "csv") {
    const rows = await prisma.platformPayment.findMany({
      where,
      include: { organization: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });
    const header = "id,organization,slug,amountCents,status,mpPaymentId,description,createdAt";
    const lines = rows.map((r) =>
      [
        r.id,
        JSON.stringify(r.organization.name),
        r.organization.slug,
        r.amountCents,
        r.status,
        r.mpPaymentId || "",
        JSON.stringify(r.description || ""),
        r.createdAt.toISOString(),
      ].join(","),
    );
    return new NextResponse([header, ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="platform-payments.csv"',
      },
    });
  }

  const [total, payments] = await Promise.all([
    prisma.platformPayment.count({ where }),
    prisma.platformPayment.findMany({
      where,
      include: { organization: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return NextResponse.json({ total, page, take, payments });
}
