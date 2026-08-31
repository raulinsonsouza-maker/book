import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { GerencialShell } from "@/components/gerencial/GerencialShell";

export default async function GerencialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isPlatformAdmin) redirect("/app");

  return (
    <GerencialShell userName={session.user.name}>{children}</GerencialShell>
  );
}
