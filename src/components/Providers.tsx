"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ProductBrandProvider } from "@/components/brand/ProductBrandProvider";
import type { ProductBrandId } from "@/lib/product-brand";

export function Providers({
  productBrandId,
  children,
}: {
  productBrandId: ProductBrandId;
  children: ReactNode;
}) {
  return (
    <SessionProvider>
      <ProductBrandProvider brandId={productBrandId}>
        {children}
      </ProductBrandProvider>
    </SessionProvider>
  );
}
