import { redirect } from "next/navigation";

export default async function IntegracoesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  q.set("tab", "integracoes");
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v) q.set(key, v);
  }
  redirect(`/app/configuracoes?${q.toString()}`);
}
