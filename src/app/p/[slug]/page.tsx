import { BookingFunnel } from "@/components/booking/BookingFunnel";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BookingFunnel slug={slug} />;
}
