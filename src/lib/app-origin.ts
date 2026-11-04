import {
  getProductBrand,
  type ProductBrand,
  type ProductBrandId,
} from "@/lib/product-brand";

export const BOOK_APP_HOST = "book.symbius.com.br";
export const TEMARK_APP_HOST = "app.temark.com.br";

const TEMARK_HOSTS = new Set([
  TEMARK_APP_HOST,
  "www.app.temark.com.br",
  "temark.com.br",
  "www.temark.com.br",
]);

export function normalizeHost(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.split(",")[0]!.trim().split(":")[0]!.toLowerCase();
}

export function isTemarkHost(host: string | null | undefined): boolean {
  return TEMARK_HOSTS.has(normalizeHost(host));
}

export function productBrandIdFromHost(
  host: string | null | undefined,
): ProductBrandId {
  return isTemarkHost(host) ? "temark" : "book";
}

export function productBrandFromHost(
  host: string | null | undefined,
): ProductBrand {
  return getProductBrand(productBrandIdFromHost(host));
}

export function originFromHost(
  host: string | null | undefined,
  proto?: string | null,
): string {
  const h = normalizeHost(host);
  if (!h) return defaultAppOrigin();
  const scheme =
    proto === "http" || proto === "https"
      ? proto
      : h.includes("localhost") || h.startsWith("127.")
        ? "http"
        : "https";
  return `${scheme}://${h}`;
}

export function defaultAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    `https://${BOOK_APP_HOST}`
  ).replace(/\/$/, "");
}

export function clientHostBrandId(): ProductBrandId {
  if (typeof window === "undefined") return "book";
  return productBrandIdFromHost(window.location.hostname);
}
