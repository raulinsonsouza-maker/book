import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { unlink } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseProductFormConfig,
  serializeProductFormConfig,
} from "@/lib/product-form-config";
import { ensureProductCheckoutLink } from "@/lib/checkout-slug";
import { serializeNotifyEmails } from "@/lib/intake/notify-emails";
import {
  normalizeBackgroundColor,
  parseProductImageUrls,
  parseVideoUrl,
  productImageFilename,
} from "@/lib/product-media";

const schema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  priceCents: z.number().int().min(0).optional(),
  caktoOfferId: z.string().optional().nullable(),
  formConfig: z.any().optional(),
  isActive: z.boolean().optional(),
  productKind: z.enum(["SIMPLE", "INTAKE"]).optional(),
  intakeTemplateKey: z.string().optional().nullable(),
  notifyEmails: z.array(z.string().email()).optional(),
  intakeEmailAlerts: z.boolean().optional(),
  /** null = usar padrão da organização */
  cardMaxInstallments: z.number().int().min(1).max(12).nullable().optional(),
  backgroundColor: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      checkoutLinks: { orderBy: { createdAt: "desc" } },
      _count: { select: { orders: true } },
      organization: { select: { cardMaxInstallments: true } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  if (product.checkoutLinks.length === 0) {
    const link = await ensureProductCheckoutLink(product.id, product.title);
    product.checkoutLinks = [link];
  }

  const { organization, ...rest } = product;
  return NextResponse.json({
    ...rest,
    backgroundColor: normalizeBackgroundColor(product.backgroundColor),
    imageUrls: parseProductImageUrls(product.imageUrls),
    videoUrl: parseVideoUrl(product.videoUrl),
    orgCardMaxInstallments: Math.min(
      12,
      Math.max(1, organization.cardMaxInstallments || 12),
    ),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.product.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const backgroundColor =
      body.backgroundColor === undefined
        ? undefined
        : body.backgroundColor === null || body.backgroundColor === ""
          ? null
          : normalizeBackgroundColor(body.backgroundColor);
    if (
      body.backgroundColor !== undefined &&
      body.backgroundColor !== null &&
      body.backgroundColor !== "" &&
      backgroundColor === null
    ) {
      return NextResponse.json(
        { error: "Cor de fundo inválida — use #RRGGBB" },
        { status: 400 },
      );
    }

    const videoUrl =
      body.videoUrl === undefined
        ? undefined
        : body.videoUrl === null || body.videoUrl.trim() === ""
          ? null
          : parseVideoUrl(body.videoUrl);
    if (
      body.videoUrl !== undefined &&
      body.videoUrl !== null &&
      body.videoUrl.trim() !== "" &&
      videoUrl === null
    ) {
      return NextResponse.json(
        {
          error:
            "URL de vídeo inválida — use YouTube, Vimeo ou link https .mp4",
        },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
        ...(body.caktoOfferId !== undefined ? { caktoOfferId: body.caktoOfferId } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.productKind !== undefined ? { productKind: body.productKind } : {}),
        ...(body.intakeTemplateKey !== undefined
          ? { intakeTemplateKey: body.intakeTemplateKey }
          : {}),
        ...(body.notifyEmails !== undefined
          ? { notifyEmails: serializeNotifyEmails(body.notifyEmails) }
          : {}),
        ...(body.intakeEmailAlerts !== undefined
          ? { intakeEmailAlerts: body.intakeEmailAlerts }
          : {}),
        ...(body.cardMaxInstallments !== undefined
          ? { cardMaxInstallments: body.cardMaxInstallments }
          : {}),
        ...(backgroundColor !== undefined ? { backgroundColor } : {}),
        ...(videoUrl !== undefined ? { videoUrl } : {}),
        ...(body.formConfig !== undefined
          ? {
              formConfig: serializeProductFormConfig(
                parseProductFormConfig(JSON.stringify(body.formConfig)),
              ),
            }
          : {}),
      },
    });

    return NextResponse.json({
      ...product,
      backgroundColor: normalizeBackgroundColor(product.backgroundColor),
      imageUrls: parseProductImageUrls(product.imageUrls),
      videoUrl: parseVideoUrl(product.videoUrl),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const imageUrls = parseProductImageUrls(existing.imageUrls);
  await prisma.product.delete({ where: { id } });

  await Promise.all(
    imageUrls.map(async (url) => {
      const filename = productImageFilename(url);
      if (!filename) return;
      try {
        await unlink(
          path.join(process.cwd(), "public", "uploads", "products", filename),
        );
      } catch {
        /* ignore */
      }
    }),
  );

  return NextResponse.json({ ok: true });
}
