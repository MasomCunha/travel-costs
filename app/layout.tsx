import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boleias — Controlo de Custos",
  description: "Gestão de custos de boleias partilhadas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
