import { createHmac, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 30 * 60 * 1000;

export type MercadoPagoOAuthState = {
  purpose?: "org" | "platform";
  organizationId?: string;
  userId: string;
  returnOrigin: string;
  /** App OAuth usado no authorize (credenciais + redirect_uri). */
  brand?: "book" | "temark";
  popup?: boolean;
  exp: number;
};

function stateSecret() {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.MERCADOPAGO_CLIENT_SECRET ||
    "mercadopago-oauth-state"
  );
}

function signPayload(payload: string) {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

export function createMercadoPagoOAuthState(
  input: Omit<MercadoPagoOAuthState, "exp">,
) {
  const body: MercadoPagoOAuthState = {
    ...input,
    returnOrigin: input.returnOrigin.replace(/\/$/, ""),
    exp: Date.now() + STATE_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function parseMercadoPagoOAuthState(
  raw: string | null | undefined,
): MercadoPagoOAuthState | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = signPayload(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as MercadoPagoOAuthState;
    if (
      !body?.userId ||
      !body?.returnOrigin ||
      !body?.exp ||
      body.exp < Date.now()
    ) {
      return null;
    }
    return body;
  } catch {
    return null;
  }
}
