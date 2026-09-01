import path from "path";
import { mkdir, writeFile, unlink, rm } from "fs/promises";
import { randomBytes } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "intake");

export function intakeStorageDir(orgId: string, submissionId: string) {
  return path.join(UPLOAD_ROOT, orgId, submissionId);
}

export function resolveIntakeStoragePath(storagePath: string) {
  const uploadsRoot = path.resolve(UPLOAD_ROOT);
  const resolved = path.resolve(uploadsRoot, storagePath);
  if (
    resolved !== uploadsRoot &&
    !resolved.startsWith(uploadsRoot + path.sep)
  ) {
    throw new Error("Invalid storage path");
  }
  return resolved;
}

export async function saveIntakeFile(params: {
  orgId: string;
  submissionId: string;
  fieldKey: string;
  buffer: Buffer;
  ext: string;
}) {
  const dir = intakeStorageDir(params.orgId, params.submissionId);
  await mkdir(dir, { recursive: true });
  const hash = randomBytes(6).toString("hex");
  const filename = `${params.fieldKey}-${hash}.${params.ext}`;
  const relative = path.join(params.orgId, params.submissionId, filename);
  const absolute = path.join(UPLOAD_ROOT, relative);
  await writeFile(absolute, params.buffer);
  return { storagePath: relative.replace(/\\/g, "/"), fileName: filename };
}

export async function deleteIntakeFile(storagePath: string) {
  try {
    const absolute = resolveIntakeStoragePath(storagePath);
    await unlink(absolute);
  } catch {
    /* ignore missing */
  }
}

export async function deleteIntakeSubmissionFiles(orgId: string, submissionId: string) {
  const dir = intakeStorageDir(orgId, submissionId);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function mimeToExt(mime: string): string | null {
  switch (mime) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}
