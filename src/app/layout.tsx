import type { Metadata } from "next";
import { Geist, Instrument_Serif, Syne } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Book Symbius — Agenda cheia. Caixa na hora.",
  description:
    "O cliente agenda e paga com Pix ou cartão na mesma tela. Calendário, equipe e financeiro para quem vive de horário marcado.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geist.variable} ${syne.variable} ${instrument.variable} h-full`}
    >
      <body className="min-h-full antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
