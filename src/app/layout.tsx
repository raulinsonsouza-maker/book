import type { Metadata } from "next";
import { Geist, Syne } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Book Symbius — Agendamento com pagamento na mesma tela",
  description:
    "Agenda pública, Pix e cartão no funil, modo salão com equipe e gestão à vista. Feito para consultórios, clínicas e salões.",
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
    <html lang="pt-BR" className={`${geist.variable} ${syne.variable} h-full`}>
      <body className="min-h-full antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
