import { getRequestProductBrand } from "@/lib/app-origin-server";
import type { ProductBrandId } from "@/lib/product-brand";

/** Copy jurídica leve por marca (mesmo documento, nomes/hosts corretos). */
export async function legalBrandCopy(): Promise<{
  brandId: ProductBrandId;
  name: string;
  hostLabel: string;
  homeHref: string;
  contact: string;
  titleSuffix: string;
}> {
  const brand = await getRequestProductBrand();
  if (brand.id === "temark") {
    return {
      brandId: "temark",
      name: "Temark",
      hostLabel: "app.temark.com.br",
      homeHref: brand.homeHref,
      contact: "contato@temark.com.br",
      titleSuffix: "Temark",
    };
  }
  return {
    brandId: "book",
    name: "Book Symbius",
    hostLabel: "book.symbius.com.br",
    homeHref: "/",
    contact: "contato@symbius.com.br",
    titleSuffix: "Book Symbius",
  };
}
