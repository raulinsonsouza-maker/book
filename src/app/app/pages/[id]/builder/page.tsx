import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Personalização ficou embutida em /app/pages/[id]#personalizar */
export default async function PageBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) redirect("/login");
  const { id } = await params;
  const page = await prisma.bookingPage.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true },
  });
  if (!page) redirect("/app/pages");
  redirect(`/app/pages/${page.id}#personalizar`);
}
