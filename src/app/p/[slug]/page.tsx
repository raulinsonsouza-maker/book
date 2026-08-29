import { redirect, notFound } from "next/navigation";
import { findPublicBookingPageByLegacySlug } from "@/lib/public-booking-page";
import { bookingPublicPath } from "@/lib/booking-page-slug";

/** Links antigos /p/{pageSlug} — redireciona se o slug ainda for único. */
export default async function LegacyPublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const match = await findPublicBookingPageByLegacySlug(slug);
  if (!match) notFound();
  redirect(bookingPublicPath(match.organization.slug, match.slug));
}
