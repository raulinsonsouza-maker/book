"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getProductBrand,
  getProductBrandCookie,
  parseProductBrand,
  setProductBrandCookie,
  type ProductBrand,
  type ProductBrandId,
} from "@/lib/product-brand";

export function useProductBrand(): ProductBrand {
  const searchParams = useSearchParams();
  const [brandId, setBrandId] = useState<ProductBrandId>(() => {
    return getProductBrandCookie() || "book";
  });

  useEffect(() => {
    const fromQuery = parseProductBrand(searchParams.get("brand"));
    if (fromQuery) {
      setProductBrandCookie(fromQuery);
      setBrandId(fromQuery);
      return;
    }
    const fromCookie = getProductBrandCookie();
    if (fromCookie) setBrandId(fromCookie);
  }, [searchParams]);

  return getProductBrand(brandId);
}
