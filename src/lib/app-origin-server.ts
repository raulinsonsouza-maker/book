import { headers } from "next/headers";
import {
  defaultAppOrigin,
  originFromHost,
  productBrandFromHost,
} from "@/lib/app-origin";
import type { ProductBrand } from "@/lib/product-brand";

/** Origin of the current HTTP request (Traefik sets x-forwarded-*). Server-only. */
export async function getRequestAppOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (!host) return defaultAppOrigin();
    const proto = h.get("x-forwarded-proto");
    return originFromHost(host, proto);
  } catch {
    return defaultAppOrigin();
  }
}

export async function getRequestProductBrand(): Promise<ProductBrand> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    return productBrandFromHost(host);
  } catch {
    return productBrandFromHost(null);
  }
}
