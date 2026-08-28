import { redirect } from "next/navigation";

export default async function CheckoutLinkDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/checkout/produtos?fromLink=${id}`);
}
