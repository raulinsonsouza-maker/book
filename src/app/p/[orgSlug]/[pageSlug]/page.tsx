import { BookingFunnel } from "@/components/booking/BookingFunnel";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
}) {
  const { orgSlug, pageSlug } = await params;
  return <BookingFunnel orgSlug={orgSlug} pageSlug={pageSlug} />;
}
