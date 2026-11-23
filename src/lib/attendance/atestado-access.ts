import { prisma } from "@/lib/prisma";

/** Contas autorizadas a emitir atestado médico (exclusivo). */
const DEFAULT_ATESTADO_ORG_SLUGS = ["consultorio-leticia-galloni"];

export function atestadoAllowedSlugs(): string[] {
  const fromEnv = process.env.ATESTADO_ORG_SLUGS?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_ATESTADO_ORG_SLUGS;
}

export function isAtestadoOrgSlug(slug: string | null | undefined) {
  if (!slug) return false;
  return atestadoAllowedSlugs().includes(slug.trim().toLowerCase());
}

export async function orgCanIssueAtestado(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  });
  return isAtestadoOrgSlug(org?.slug);
}
