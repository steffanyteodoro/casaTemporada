import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Casa de Temporada · Olímpia",
  description: "Gestão de reservas e automação de comunicação com hóspedes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>
        <div className="min-h-screen bg-cream text-ink">
          <div className="md:flex md:min-h-screen">
            <Nav />
            <main className="flex-1 px-5 md:px-10 py-8 max-w-6xl mx-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
