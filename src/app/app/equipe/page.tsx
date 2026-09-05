import { redirect } from "next/navigation";

export default function EquipeRedirectPage() {
  redirect("/app/conta?tab=equipe");
}
