import { BrandLogo } from "@/components/BrandLogo";
import type { ProductBrand } from "@/lib/product-brand";

export function AuthBrandMark({
  brand,
  size = "lg",
}: {
  brand: ProductBrand;
  size?: "md" | "lg";
}) {
  if (brand.wordmarkSrc) {
    const width = size === "lg" ? "w-44" : "w-36";
    return (
      <a
        href={brand.homeHref}
        className={`block ${width}`}
        aria-label={`${brand.name}, início`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.wordmarkSrc}
          alt={brand.name}
          className="h-auto w-full"
        />
      </a>
    );
  }

  return (
    <BrandLogo
      href={brand.homeHref}
      size={size}
      showText
      title={brand.name}
    />
  );
}
