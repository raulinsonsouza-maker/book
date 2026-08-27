import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.organizationId) {
    redirect("/login");
  }
  return session;
}

export async function requireOrg() {
  const session = await requireSession();
  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId! },
  });
  if (!org) redirect("/login");
  return { session, org };
}
