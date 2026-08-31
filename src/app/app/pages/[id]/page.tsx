import { redirect } from "next/navigation";

export default async function PageIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/agendador?id=${id}`);
}
