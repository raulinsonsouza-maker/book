import { redirect } from "next/navigation";

export default function CheckoutLinksRedirectPage() {
  redirect("/app/checkout/produtos");
}
