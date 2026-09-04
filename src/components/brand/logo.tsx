/**
 * Знак E-Analytic.
 *
 * Марка прежняя — шеврон в скруглённом квадрате, — но градиент переведён на
 * брендовую шкалу ДС (brand/600 → brand/400). В свёрнутом рельсе остаётся
 * только бейдж: подпись в 76px всё равно не читается.
 */

import { cn } from "@/lib/utils";

export function LogoBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="eaLogo" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--brand-600))" />
          <stop offset="1" stopColor="hsl(var(--brand-400))" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="10" fill="url(#eaLogo)" />
      <path d="M27 11 L11 24 L27 37 L27 29 L21 24 L27 19 Z" fill="#fff" />
      <path d="M34 12 L41 19 L34 26 L27 19 Z" fill="#fff" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoBadge />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-foreground">
            ANALYTIC
          </span>
          <span className="mt-1 text-overline uppercase text-muted-foreground">
            Платформа
          </span>
        </span>
      )}
    </span>
  );
}
