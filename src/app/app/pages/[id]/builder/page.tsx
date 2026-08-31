import { redirect } from "next/navigation";

/** Personalização embutida no Agendador */
export default async function BuilderRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/agendador?id=${id}`);
}
