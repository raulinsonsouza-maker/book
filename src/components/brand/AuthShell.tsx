import type { ReactNode } from "react";
import type { ProductBrandId } from "@/lib/product-brand";

export function AuthShell({
  brandId,
  children,
}: {
  brandId: ProductBrandId;
  children: ReactNode;
}) {
  return (
    <div
      className="auth-shell flex min-h-screen items-center justify-center px-4 py-10"
      data-brand={brandId}
    >
      {children}
    </div>
  );
}
