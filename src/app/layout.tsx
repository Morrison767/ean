import type { Metadata } from "next";

import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "E-Analytic — платформа антикоррупционной аналитики",
  description:
    "Досье физических и юридических лиц, выписки, ЭСФ, госзакупки и ВЭД",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/*
          Тема ставится классом до первой отрисовки: иначе у человека с тёмной
          системой страница мигает белым. suppressHydrationWarning — потому что
          класс на <html> появляется до React и не совпадает с разметкой сервера.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
