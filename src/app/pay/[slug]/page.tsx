import { InstantCheckout } from "@/components/checkout/InstantCheckout";

export default async function PayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <InstantCheckout slug={slug} />;
}
