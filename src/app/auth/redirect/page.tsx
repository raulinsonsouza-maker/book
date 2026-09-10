import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { postLoginPath } from "@/lib/auth-routes";

/** Ponto único pós-OAuth / deep-link — evita Google sempre cair em /app. */
export default async function AuthRedirectPage() {
  const session = await getSession();
  redirect(postLoginPath(session?.user));
}
