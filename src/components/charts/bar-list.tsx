"use client";

/**
 * Ранжированный список величин.
 *
 * Задача данных — величина, а не принадлежность, поэтому цвет один: брендовый.
 * Категориальная палитра здесь была бы враньём — она сообщала бы, что строки
 * различаются по смыслу, тогда как различаются они только размером. Две
 * несопоставимые величины (импорт и экспорт) показываем двумя списками рядом,
 * а не одним с двумя цветами.
 *
 * Метки значений стоят у каждой строки: столбик короче трети ширины прочитать
 * на глаз нельзя, а сравнивать приходится именно числа.
 */

import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface BarItem {
  label: string;
  value: number;
  /** Готовая подпись значения: «286 млн ₸», «$4 200 000». */
  display: string;
  /** Вторая строка под подписью — код ТН ВЭД, БИН, доля. */
  hint?: string;
}

export function BarList({
  items,
  /** Сколько строк показать; остальные сворачиваются в «Прочие». */
  limit = 8,
  className,
}: {
  items: BarItem[];
  limit?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);

  /* Прочие сворачиваем в одну строку, а не рисуем девятым цветом. */
  const rows =
    tail.length > 0
      ? [
          ...head,
          {
            label: `Прочие (${tail.length})`,
            value: tail.reduce((s, x) => s + x.value, 0),
            display: "",
            hint: undefined,
          } as BarItem,
        ]
      : head;

  const max = Math.max(...rows.map((r) => r.value), 1);

  if (rows.length === 0) {
    return (
      <p className={cn("px-4 py-6 text-sm text-muted-foreground sm:px-5", className)}>
        Нет данных для показа
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-3 p-4 sm:p-5", className)}>
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        return (
          <li key={`${r.label}-${i}`} className="group flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-sm text-foreground" title={r.label}>
                  {r.label}
                </span>
                {r.hint && (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {r.hint}
                  </span>
                )}
              </span>
              {r.display && (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {r.display}
                </span>
              )}
            </div>
            {/* Дорожка 6px: тонкая метка, скруглённый конец у данных. */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: reduce ? `${pct}%` : 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{
                  duration: reduce ? 0 : motionTokens.duration.slow,
                  ease: motionTokens.easing.smooth,
                  delay: reduce ? 0 : i * 0.04,
                }}
                className="h-full rounded-full bg-primary transition-colors group-hover:bg-brand-600"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
