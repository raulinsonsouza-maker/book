const CLICK_KEYS = ["gclid", "fbclid", "fbc", "fbp"] as const;

export type ClickIds = {
  gclid?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
};

const STORAGE_KEY = "bs_click_ids";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Captura gclid/fbclid da URL e cookies _fbc/_fbp; persiste em sessionStorage. */
export function captureClickIds(): ClickIds {
  if (typeof window === "undefined") return {};

  let stored: ClickIds = {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as ClickIds;
  } catch {
    stored = {};
  }

  const params = new URLSearchParams(window.location.search);
  const next: ClickIds = { ...stored };

  const gclid = params.get("gclid");
  if (gclid) next.gclid = gclid.slice(0, 200);

  const fbclid = params.get("fbclid");
  if (fbclid) {
    next.fbclid = fbclid.slice(0, 200);
    if (!next.fbc) {
      next.fbc = `fb.1.${Date.now()}.${fbclid}`.slice(0, 200);
    }
  }

  const fbc = readCookie("_fbc");
  if (fbc) next.fbc = fbc.slice(0, 200);
  const fbp = readCookie("_fbp");
  if (fbp) next.fbp = fbp.slice(0, 200);

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function getStoredClickIds(): ClickIds {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return captureClickIds();
    return JSON.parse(raw) as ClickIds;
  } catch {
    return captureClickIds();
  }
}

export function clickIdsForPayload(ids?: ClickIds | null): Record<string, string> {
  const source = ids || getStoredClickIds();
  const out: Record<string, string> = {};
  for (const key of CLICK_KEYS) {
    const v = source[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim().slice(0, 200);
  }
  return out;
}

/** Sanitiza click IDs vindos do client no server. */
export function sanitizeClickIds(input: unknown): ClickIds {
  if (!input || typeof input !== "object") return {};
  const obj = input as Record<string, unknown>;
  const out: ClickIds = {};
  for (const key of CLICK_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) {
      out[key] = v.trim().slice(0, 200);
    }
  }
  return out;
}
