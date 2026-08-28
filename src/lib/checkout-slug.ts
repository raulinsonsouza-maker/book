import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function uniqueCheckoutLinkSlug(title: string, excludeId?: string) {
  let slug = slugify(title);
  if (!slug) slug = `checkout-${Date.now().toString(36)}`;

  const taken = await prisma.checkoutLink.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (taken) slug = `${slug}-${Date.now().toString(36)}`;
  return slug;
}
