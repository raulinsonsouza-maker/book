/** Comissão interna do profissional — não aparece no funil público. */

export function normalizeCommissionPercent(value: unknown, fallback = 50): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function commissionCents(
  amountCents: number,
  opts: { enabled?: boolean | null; percent?: number | null },
): number {
  if (!opts.enabled) return 0;
  const percent = normalizeCommissionPercent(opts.percent, 0);
  if (percent <= 0 || amountCents <= 0) return 0;
  return Math.round((amountCents * percent) / 100);
}
