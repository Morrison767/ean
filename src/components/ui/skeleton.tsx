"use client";

/**
 * Скелетон загрузки (shimmer).
 *
 * Пульсация по opacity — свойство композитное, поэтому анимация идёт на GPU
 * и не вызывает пересчёт раскладки. При prefers-reduced-motion пульсация
 * выключается: остаётся статичная серая плашка.
 */

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      className={cn("block rounded-lg bg-muted", className)}
      animate={reduce ? undefined : { opacity: [0.55, 1, 0.55] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Заглушка карточки результата поиска — повторяет её раскладку. */
export function ResultSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3"
        >
          <Skeleton className="h-7 w-28 shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </span>
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        </li>
      ))}
    </ul>
  );
}
