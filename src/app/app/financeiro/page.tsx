import { getAuthContext, isProfessionalRole } from "@/lib/rbac";
import { FinanceiroView } from "./FinanceiroView";

export default async function FinanceiroPage() {
  const ctx = await getAuthContext();
  const isProfessionalView = Boolean(
    ctx && isProfessionalRole(ctx.role) && ctx.professionalId,
  );

  return <FinanceiroView isProfessionalView={isProfessionalView} />;
}
