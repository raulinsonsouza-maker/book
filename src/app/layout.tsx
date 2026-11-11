import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Geist, Instrument_Serif, Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import { getRequestProductBrand } from "@/lib/app-origin-server";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestProductBrand();
  return {
    title: brand.title,
    description: brand.description,
    applicationName: brand.name,
    icons: {
      icon: [{ url: brand.faviconSrc }],
      shortcut: brand.faviconSrc,
      apple: [{ url: brand.faviconSrc }],
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const brand = await getRequestProductBrand();
  return {
    themeColor: brand.themeColor,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = await getRequestProductBrand();
  return (
    <html
      lang="pt-BR"
      data-product-brand={brand.id}
      className={`${geist.variable} ${outfit.variable} ${dmSans.variable} ${fraunces.variable} ${instrument.variable} h-full`}
    >
      <body className="min-h-full antialiased font-sans">
        <Providers productBrandId={brand.id}>{children}</Providers>
      </body>
    </html>
  );
}
