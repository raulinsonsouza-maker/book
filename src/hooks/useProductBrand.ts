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

function initialBrandId(): ProductBrandId {
  const fromHost = clientHostBrandId();
  if (fromHost === "temark") return "temark";
  return getProductBrandCookie() || fromHost;
}

/** Host-first brand (safe in layouts — no useSearchParams). */
export function useHostProductBrand(): ProductBrand {
  const [brandId, setBrandId] = useState<ProductBrandId>(initialBrandId);

  useEffect(() => {
    const fromHost = clientHostBrandId();
    if (fromHost === "temark") {
      setProductBrandCookie("temark");
      setBrandId("temark");
      return;
    }
    const fromCookie = getProductBrandCookie();
    setBrandId(fromCookie || fromHost);
  }, []);

  return getProductBrand(brandId);
}

export function useProductBrand(): ProductBrand {
  const searchParams = useSearchParams();
  const [brandId, setBrandId] = useState<ProductBrandId>(initialBrandId);

  useEffect(() => {
    const fromQuery = parseProductBrand(searchParams.get("brand"));
    if (fromQuery) {
      setProductBrandCookie(fromQuery);
      setBrandId(fromQuery);
      return;
    }

    const fromHost = clientHostBrandId();
    if (fromHost === "temark") {
      setProductBrandCookie("temark");
      setBrandId("temark");
      return;
    }

    const fromCookie = getProductBrandCookie();
    if (fromCookie) {
      setBrandId(fromCookie);
      return;
    }

    setBrandId(fromHost);
  }, [searchParams]);

  return getProductBrand(brandId);
}
