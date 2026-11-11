"use client";

import {
  useQueryAwareProductBrand,
  useResolvedProductBrand,
} from "@/components/brand/ProductBrandProvider";
import type { ProductBrand } from "@/lib/product-brand";

/** Host/server brand (safe in layouts — no useSearchParams). */
export function useHostProductBrand(): ProductBrand {
  return useResolvedProductBrand();
}

/** Product brand including ?brand= overrides on auth/onboarding. */
export function useProductBrand(): ProductBrand {
  return useQueryAwareProductBrand();
}
