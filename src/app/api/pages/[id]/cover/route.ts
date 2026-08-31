import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

async function getOwnedPage(id: string, organizationId: string) {
  return prisma.bookingPage.findFirst({
    where: { id, organizationId },
  });
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
  const owned = await getOwnedPage(id, session.user.organizationId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    const dir = path.join(process.cwd(), "public", "uploads", "covers");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buf);

    const coverImageUrl = `/uploads/covers/${filename}`;
    const page = await prisma.bookingPage.update({
      where: { id },
      data: { coverImageUrl },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        coverImageUrl: true,
      },
    });

    return NextResponse.json(page);
  } catch (e) {
    console.error("[pages/cover]", e);
    return NextResponse.json(
      { error: "Não foi possível salvar a foto de capa" },
      { status: 500 },
    );
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
  const owned = await getOwnedPage(id, session.user.organizationId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const page = await prisma.bookingPage.update({
    where: { id },
    data: { coverImageUrl: null },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      coverImageUrl: true,
    },
  });
  return NextResponse.json(page);
}
