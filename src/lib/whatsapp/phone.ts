/** Normalize BR-centric phone input to E.164 (+digits). */
export function toE164(
  raw: string,
  defaultCountry = "55",
): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("0")) n = n.slice(1);
  if (!n.startsWith(defaultCountry) && n.length <= 11) {
    n = `${defaultCountry}${n}`;
  }
  if (n.length < 12 || n.length > 15) return null;
  return `+${n}`;
}

export function e164Digits(e164: string): string {
  return e164.replace(/\D/g, "");
}
