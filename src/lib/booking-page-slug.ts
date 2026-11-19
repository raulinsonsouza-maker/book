import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { defaultAppOrigin } from "@/lib/app-origin";
import { getProductBrand, type ProductBrandId } from "@/lib/product-brand";

/** Slug da agenda único dentro da organização (duas empresas podem ter "consultoria"). */
export async function uniqueBookingPageSlug(
  organizationId: string,
  title: string,
  excludeId?: string,
) {
  let slug = slugify(title);
  if (!slug) slug = `agenda-${Date.now().toString(36)}`;

  const taken = await prisma.bookingPage.findFirst({
    where: {
      organizationId,
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (taken) slug = `${slug}-${Date.now().toString(36)}`;
  return slug;
}

export function bookingPublicPath(orgSlug: string, pageSlug: string) {
  return `/p/${orgSlug}/${pageSlug}`;
}

export function bookingPublicUrl(
  orgSlug: string,
  pageSlug: string,
  brandId?: ProductBrandId,
) {
  const base = (
    brandId === "temark"
      ? getProductBrand("temark").appOrigin
      : defaultAppOrigin()
  ).replace(/\/$/, "");
  return `${base}${bookingPublicPath(orgSlug, pageSlug)}`;
}
