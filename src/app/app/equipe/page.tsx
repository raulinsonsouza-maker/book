import { redirect } from "next/navigation";

export default function EquipeRedirectPage() {
  redirect("/app/configuracoes?tab=equipe");
}
