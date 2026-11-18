import { redirect } from "next/navigation";

export default function IntegrationsEnRedirectPage() {
  redirect("/app/configuracoes?tab=integracoes");
}
