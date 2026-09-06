import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminShell } from "@/components/platform/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/primeiro-acesso");
  if (!session.user.isPlatformAdmin) redirect("/app");

  return (
    <AdminShell userName={session.user.name}>{children}</AdminShell>
  );
}
