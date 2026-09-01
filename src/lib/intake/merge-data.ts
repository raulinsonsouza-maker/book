import { defaultPartner } from "@/lib/intake/templates/company-opening-br";
import type { CompanyOpeningBrData } from "@/lib/intake/types";

function normalizeOwnership(
  partnerCount: number,
  ownership: CompanyOpeningBrData["ownership"] | undefined,
): CompanyOpeningBrData["ownership"] {
  if (partnerCount <= 0) return [];

  const valid =
    ownership?.filter(
      (o) => o.partnerIndex >= 0 && o.partnerIndex < partnerCount,
    ) ?? [];

  if (valid.length === partnerCount) {
    const indices = new Set(valid.map((o) => o.partnerIndex));
    if (indices.size === partnerCount) return valid;
  }

  const equal = Math.floor((100 / partnerCount) * 100) / 100;
  return Array.from({ length: partnerCount }, (_, i) => ({
    partnerIndex: i,
    percentage: i === 0 ? 100 - equal * (partnerCount - 1) : equal,
  }));
}

/** Mescla rascunho parcial com defaults — evita perder campos ao salvar etapas. */
export function mergeIntakeData(
  base: CompanyOpeningBrData,
  incoming: Partial<CompanyOpeningBrData>,
): CompanyOpeningBrData {
  const partners =
    incoming.partners?.length && incoming.partners.length > 0
      ? incoming.partners.map((p, i) => ({
          ...defaultPartner(),
          ...base.partners[i],
          ...p,
        }))
      : base.partners;

  const companyNameOptions = incoming.companyNameOptions ?? base.companyNameOptions;

  const adminIndices = (
    incoming.administration?.administratorPartnerIndices ??
    base.administration.administratorPartnerIndices
  ).filter((i) => i >= 0 && i < partners.length);

  return {
    partners,
    companyNameOptions: [
      companyNameOptions[0] ?? "",
      companyNameOptions[1] ?? "",
      companyNameOptions[2] ?? "",
    ],
    tradeName: incoming.tradeName ?? base.tradeName,
    preferredLegalName: incoming.preferredLegalName ?? base.preferredLegalName,
    shareCapitalReais: incoming.shareCapitalReais ?? base.shareCapitalReais,
    ownership: normalizeOwnership(partners.length, incoming.ownership ?? base.ownership),
    administration: {
      mode: incoming.administration?.mode ?? base.administration.mode,
      administratorPartnerIndices:
        adminIndices.length > 0 ? adminIndices : [0],
    },
    activities: incoming.activities ?? base.activities,
    headquarters: {
      ...base.headquarters,
      ...incoming.headquarters,
    },
  };
}
