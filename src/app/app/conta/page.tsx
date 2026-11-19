import { redirect } from "next/navigation";

export default async function ContaRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tabRaw = sp.tab;
  const tab = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;
  const targetTab = tab === "equipe" ? "equipe" : "perfil";
  const q = new URLSearchParams();
  q.set("tab", targetTab);
  for (const [key, value] of Object.entries(sp)) {
    if (key === "tab" || value == null) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v) q.set(key, v);
  }
  redirect(`/app/configuracoes?${q.toString()}`);
}
