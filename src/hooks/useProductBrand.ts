"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { clientHostBrandId } from "@/lib/app-origin";
import {
  getProductBrand,
  getProductBrandCookie,
  parseProductBrand,
  setProductBrandCookie,
  type ProductBrand,
  type ProductBrandId,
} from "@/lib/product-brand";

function brandFromDocument(): ProductBrandId | null {
  if (typeof document === "undefined") return null;
  const raw = document.documentElement.dataset.productBrand;
  return parseProductBrand(raw);
}

function resolveClientBrandId(
  queryBrand?: string | null,
): ProductBrandId {
  const fromQuery = parseProductBrand(queryBrand);
  if (fromQuery) return fromQuery;

  const fromDoc = brandFromDocument();
  if (fromDoc) return fromDoc;

  const fromHost = clientHostBrandId();
  if (fromHost === "temark") return "temark";

  return getProductBrandCookie() || fromHost;
}

/** Host-first brand (safe in layouts — no useSearchParams). */
export function useHostProductBrand(): ProductBrand {
  // SSR + first client paint stay on "book" to avoid hydration mismatch;
  // Host/doc refine immediately after mount.
  const [brandId, setBrandId] = useState<ProductBrandId>("book");

  useEffect(() => {
    const next = resolveClientBrandId();
    if (next === "temark") setProductBrandCookie("temark");
    setBrandId(next);
  }, []);

  return getProductBrand(brandId);
}

export function useProductBrand(): ProductBrand {
  const searchParams = useSearchParams();
  const [brandId, setBrandId] = useState<ProductBrandId>("book");

  useEffect(() => {
    const next = resolveClientBrandId(searchParams.get("brand"));
    if (next === "temark" || next === "book") {
      if (searchParams.get("brand") || next === "temark") {
        setProductBrandCookie(next);
      }
    }
    setBrandId(next);
  }, [searchParams]);

  return getProductBrand(brandId);
}
