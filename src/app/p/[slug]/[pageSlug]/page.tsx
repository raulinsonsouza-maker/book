import { BookingFunnel } from "@/components/booking/BookingFunnel";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug: orgSlug, pageSlug } = await params;
  return <BookingFunnel orgSlug={orgSlug} pageSlug={pageSlug} />;
}
