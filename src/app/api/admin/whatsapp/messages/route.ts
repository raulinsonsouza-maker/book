import { NextResponse } from "next/server";
import { apiRequirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await apiRequirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";
  const category = url.searchParams.get("category")?.trim() || "";
  const orgId = url.searchParams.get("organizationId")?.trim() || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const take = Math.min(100, Math.max(10, parseInt(url.searchParams.get("take") || "50", 10)));
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (orgId) where.organizationId = orgId;
  if (q) {
    where.OR = [
      { toPhoneE164: { contains: q } },
      { templateName: { contains: q } },
      { metaMessageId: { contains: q } },
      { organization: { name: { contains: q } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.whatsAppMessageLog.count({ where }),
    prisma.whatsAppMessageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, page, take, rows });
}
