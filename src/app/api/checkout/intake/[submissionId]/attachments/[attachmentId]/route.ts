import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";
import { resolveIntakeStoragePath } from "@/lib/intake/storage";
import { parseIntakeData } from "@/lib/intake/validation/company-opening-br";
import { fileFieldLabel } from "@/lib/intake/required-files";
import { buildZipBuffer, sanitizeZipName } from "@/lib/intake/build-zip";

async function loadOwned(
  submissionId: string,
  organizationId: string,
  attachmentId?: string,
) {
  const submission = await prisma.intakeSubmission.findFirst({
    where: { id: submissionId, organizationId },
    include: {
      attachments: attachmentId
        ? { where: { id: attachmentId } }
        : true,
    },
  });
  return submission;
}

export async function GET(
  _req: Request,
  {
    params,
  }: { params: Promise<{ submissionId: string; attachmentId: string }> },
) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const { submissionId, attachmentId } = await params;
  const submission = await loadOwned(
    submissionId,
    auth.ctx.organizationId,
    attachmentId,
  );
  const attachment = submission?.attachments[0];
  if (!submission || !attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const absolute = resolveIntakeStoragePath(attachment.storagePath);
    const buf = await readFile(absolute);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
