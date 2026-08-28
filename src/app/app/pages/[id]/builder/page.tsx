import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageBuilder } from "@/components/builder/PageBuilder";

export default async function PageBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await requireOrg();
  const { id } = await params;
  const page = await prisma.bookingPage.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!page) notFound();

  return <PageBuilder pageId={page.id} slug={page.slug} />;
}
