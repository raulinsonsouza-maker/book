import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { unlink, writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGE_PREFIX,
  parseProductImageUrls,
  productImageFilename,
  serializeProductImageUrls,
} from "@/lib/product-media";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

async function getOwnedProduct(id: string, organizationId: string) {
  return prisma.product.findFirst({
    where: { id, organizationId },
    select: { id: true, imageUrls: true },
  });
}

async function unlinkProductImage(url: string) {
  const filename = productImageFilename(url);
  if (!filename) return;
  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "products",
    filename,
  );
  try {
    await unlink(filePath);
  } catch {
    /* ignore missing */
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await getOwnedProduct(id, session.user.organizationId);
  if (!owned) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const current = parseProductImageUrls(owned.imageUrls);
  if (current.length >= MAX_PRODUCT_IMAGES) {
    return NextResponse.json(
      { error: `Máximo de ${MAX_PRODUCT_IMAGES} fotos` },
      { status: 400 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Envie uma imagem" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Envie uma imagem (PNG, JPG ou WebP)" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Imagem muito grande — use até 2 MB" },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const filename = `${id}-${randomBytes(6).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buf);

    const url = `${PRODUCT_IMAGE_PREFIX}${filename}`;
    const next = [...current, url];
    const product = await prisma.product.update({
      where: { id },
      data: { imageUrls: serializeProductImageUrls(next) },
      select: { id: true, imageUrls: true },
    });

    return NextResponse.json({
      imageUrls: parseProductImageUrls(product.imageUrls),
      url,
    });
  } catch (e) {
    console.error("[products/images]", e);
    return NextResponse.json(
      { error: "Não foi possível salvar a foto" },
      { status: 500 },
    );
  }
}

const reorderSchema = z.object({
  imageUrls: z.array(z.string()).max(MAX_PRODUCT_IMAGES),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await getOwnedProduct(id, session.user.organizationId);
  if (!owned) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    const body = reorderSchema.parse(await req.json());
    const current = parseProductImageUrls(owned.imageUrls);
    const next = body.imageUrls
      .map((u) => u.trim())
      .filter((u) => current.includes(u));

    const sameSet =
      next.length === current.length &&
      current.every((u) => next.includes(u)) &&
      next.every((u) => current.includes(u));
    if (!sameSet) {
      return NextResponse.json(
        { error: "Ordem inválida — use apenas as fotos atuais" },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: { imageUrls: serializeProductImageUrls(next) },
      select: { id: true, imageUrls: true },
    });

    return NextResponse.json({
      imageUrls: parseProductImageUrls(product.imageUrls),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  url: z.string().min(1),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await getOwnedProduct(id, session.user.organizationId);
  if (!owned) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    const urlFromQuery = new URL(req.url).searchParams.get("url");
    const body = urlFromQuery
      ? { url: urlFromQuery }
      : deleteSchema.parse(await req.json());
    const url = body.url.trim();
    const current = parseProductImageUrls(owned.imageUrls);
    if (!current.includes(url)) {
      return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
    }

    const next = current.filter((u) => u !== url);
    const product = await prisma.product.update({
      where: { id },
      data: { imageUrls: serializeProductImageUrls(next) },
      select: { id: true, imageUrls: true },
    });
    await unlinkProductImage(url);

    return NextResponse.json({
      imageUrls: parseProductImageUrls(product.imageUrls),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
