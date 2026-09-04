import type { Metadata } from "next";
import localFont from "next/font/local";

import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";

/**
 * Open Sans — шрифт дизайн-системы. Вариативный (300–800), поэтому одного
 * файла на сабсет хватает на все начертания.
 *
 * Подключён через next/font/local, а не через @font-face в CSS: адрес файла
 * подставляет сборщик, и он учитывает basePath. Написанный руками
 * url("/fonts/…") на GitHub Pages вёл бы в корень домена, где ничего нет, —
 * страница молча съезжала бы на системный шрифт.
 */
const openSans = localFont({
  src: [
    { path: "../fonts/open-sans-latin.woff2", weight: "300 800", style: "normal" },
    { path: "../fonts/open-sans-cyrillic.woff2", weight: "300 800", style: "normal" },
  ],
  variable: "--font-open-sans",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "E-Analytic — платформа антикоррупционной аналитики",
  description:
    "Досье физических и юридических лиц, выписки, ЭСФ, госзакупки и ВЭД",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={openSans.variable} suppressHydrationWarning>
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
