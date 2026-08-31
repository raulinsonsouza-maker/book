import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const ALLOWED_ROOTS = new Set(["covers"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const parts = (await params).path ?? [];
  if (
    parts.length < 2 ||
    parts.some((p) => !p || p.includes("..") || p.includes("/") || p.includes("\\"))
  ) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!ALLOWED_ROOTS.has(parts[0]!)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const resolved = path.resolve(uploadsRoot, ...parts);
  if (
    resolved !== uploadsRoot &&
    !resolved.startsWith(uploadsRoot + path.sep)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    await stat(resolved);
    const buf = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
