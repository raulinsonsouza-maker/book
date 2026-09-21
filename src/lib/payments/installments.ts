/** Máximo de parcelas no cartão: override do produto ou padrão da organização. */
export function resolveCardMaxInstallments(
  productMax: number | null | undefined,
  orgMax: number | null | undefined,
): number {
  if (productMax != null && Number.isFinite(productMax)) {
    return Math.min(12, Math.max(1, Math.floor(productMax)));
  }
  return Math.min(12, Math.max(1, orgMax || 12));
}
