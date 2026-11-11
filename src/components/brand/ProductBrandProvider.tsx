"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { clientHostBrandId } from "@/lib/app-origin";
import {
  getProductBrand,
  parseProductBrand,
  setProductBrandCookie,
  type ProductBrand,
  type ProductBrandId,
} from "@/lib/product-brand";

const ProductBrandContext = createContext<ProductBrandId>("book");

export function ProductBrandProvider({
  brandId,
  children,
}: {
  brandId: ProductBrandId;
  children: ReactNode;
}) {
  useEffect(() => {
    if (brandId === "temark") setProductBrandCookie("temark");
  }, [brandId]);

  return (
    <ProductBrandContext.Provider value={brandId}>
      {children}
    </ProductBrandContext.Provider>
  );
}

export function useServerProductBrandId(): ProductBrandId {
  return useContext(ProductBrandContext);
}

/** Brand for layouts/shells — host/server first, no searchParams. */
export function useResolvedProductBrand(): ProductBrand {
  const serverId = useContext(ProductBrandContext);
  const [brandId, setBrandId] = useState<ProductBrandId>(serverId);

  useEffect(() => {
    const fromHost = clientHostBrandId();
    const next =
      serverId === "temark"
        ? "temark"
        : fromHost === "temark"
          ? "temark"
          : serverId;
    if (next === "temark") setProductBrandCookie("temark");
    setBrandId(next);
  }, [serverId]);

  return useMemo(() => getProductBrand(brandId), [brandId]);
}

/** Brand that also honors ?brand= on auth/onboarding entry points. */
export function useQueryAwareProductBrand(): ProductBrand {
  const serverId = useContext(ProductBrandContext);
  const searchParams = useSearchParams();
  const [brandId, setBrandId] = useState<ProductBrandId>(serverId);

  useEffect(() => {
    const fromQuery = parseProductBrand(searchParams.get("brand"));
    const fromHost = clientHostBrandId();
    const next =
      fromQuery ||
      (serverId === "temark" || fromHost === "temark" ? "temark" : serverId);
    if (fromQuery || next === "temark") setProductBrandCookie(next);
    setBrandId(next);
  }, [searchParams, serverId]);

  return useMemo(() => getProductBrand(brandId), [brandId]);
}
