import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRequireAdmin } from "@/lib/rbac";
import { parseIntakeData } from "@/lib/intake/validation/company-opening-br";
import { fileFieldLabel } from "@/lib/intake/required-files";
import { buildZipBuffer, sanitizeZipName } from "@/lib/intake/build-zip";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const auth = await apiRequireAdmin();
  if ("error" in auth) return auth.error;

  const { submissionId } = await params;
  const submission = await prisma.intakeSubmission.findFirst({
    where: { id: submissionId, organizationId: auth.ctx.organizationId },
    include: {
      attachments: true,
      checkoutOrder: { include: { product: true } },
    },
  });
  if (!submission) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = parseIntakeData(submission.data);
  const entries = submission.attachments.map((a) => {
    const label = data ? fileFieldLabel(a.fieldKey, data) : a.fieldKey;
    const safe = sanitizeZipName(`${label}-${a.fileName}`);
    return { name: safe, storagePath: a.storagePath };
  });

  const zip = buildZipBuffer(entries);
  const filename = sanitizeZipName(
    `${submission.checkoutOrder.product.title}-${submission.id.slice(-8)}.zip`,
  );

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
