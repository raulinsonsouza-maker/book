export const PRODUCT_BRAND_COOKIE = "product_brand";
export const PRODUCT_BRAND_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type ProductBrandId = "book" | "temark";

export type ProductBrand = {
  id: ProductBrandId;
  name: string;
  shortName: string;
  /** Wide wordmark for Temark; square mark handled by BrandLogo for Book. */
  wordmarkSrc?: string;
  homeHref: string;
};

export const PRODUCT_BRANDS: Record<ProductBrandId, ProductBrand> = {
  book: {
    id: "book",
    name: "Book Symbius",
    shortName: "Book",
    homeHref: "/",
  },
  temark: {
    id: "temark",
    name: "Temark",
    shortName: "Temark",
    wordmarkSrc: "/temark-logo.png",
    homeHref: "https://temark.com.br",
  },
};

export function parseProductBrand(
  raw: string | null | undefined,
): ProductBrandId | null {
  if (raw === "temark" || raw === "book") return raw;
  return null;
}

export function getProductBrand(id: ProductBrandId | null | undefined): ProductBrand {
  return PRODUCT_BRANDS[id === "temark" ? "temark" : "book"];
}

/** Client-only cookie helpers */
export function setProductBrandCookie(id: ProductBrandId) {
  if (typeof document === "undefined") return;
  document.cookie = `${PRODUCT_BRAND_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${PRODUCT_BRAND_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function getProductBrandCookie(): ProductBrandId | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${PRODUCT_BRAND_COOKIE}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.split("=").slice(1).join("="));
  return parseProductBrand(raw);
}

export function clearProductBrandCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${PRODUCT_BRAND_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function resolveProductBrandId(
  queryBrand: string | null | undefined,
): ProductBrandId {
  return (
    parseProductBrand(queryBrand) ||
    getProductBrandCookie() ||
    "book"
  );
}
