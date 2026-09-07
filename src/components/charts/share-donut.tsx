"use client";

/**
 * Доли в целом: кольцо рядом с таблицей.
 *
 * Форма перенесена из прежней версии — там география ВЭД показана кольцом и
 * таблицей одновременно, и наведение на любой из них приглушает остальное.
 * Связка нужна не для красоты: кольцо отвечает «какая доля», таблица — «сколько
 * именно», и держать их порознь значит заставлять сверять глазами.
 *
 * Долей не больше шести, остальное сворачивается в «Прочие» серым: семь
 * различимых оттенков подряд подобрать нельзя, а проверка палитры этого не
 * прощает. Числа продублированы таблицей — это и есть вторичное кодирование,
 * без которого предупреждение о близости зелёного и розового было бы
 * недопустимым.
 */

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Проверено validate_palette: светлая и тёмная тема проходят все проверки. */
export const SHARE_COLORS = [
  "#068DFF",
  "#E17100",
  "#00A63E",
  "#E60076",
  "#AD46FF",
  "#E7000B",
];
const OTHER_COLOR = "hsl(var(--border-strong))";

export interface ShareItem {
  key: string;
  label: string;
  value: number;
  /** Готовая подпись суммы. */
  display: string;
}

const MAX_SLICES = 6;

export function ShareDonut({
  items,
  emptyText = "Нет операций за период",
  className,
}: {
  items: ShareItem[];
  emptyText?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const gapId = useId();
  const [hover, setHover] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, MAX_SLICES);
  const tail = sorted.slice(MAX_SLICES);
  const slices: Array<ShareItem & { color: string }> = [
    ...head.map((s, i) => ({ ...s, color: SHARE_COLORS[i] })),
    ...(tail.length
      ? [
          {
            key: "__other",
            label: `Прочие (${tail.length})`,
            value: tail.reduce((s, x) => s + x.value, 0),
            display: "",
            color: OTHER_COLOR,
          },
        ]
      : []),
  ];

  const total = slices.reduce((s, x) => s + x.value, 0);

  if (!total) {
    return (
      <p className={cn("px-4 py-6 text-sm text-muted-foreground sm:px-5", className)}>
        {emptyText}
      </p>
    );
  }

  /* Кольцо строим через strokeDasharray на окружности радиуса 15.9155:
     её длина ровно 100, поэтому доля в процентах = длина штриха. */
  const R = 15.9155;
  let offset = 25;

  return (
    <div className={cn("grid gap-5 p-4 sm:p-5 lg:grid-cols-[220px_minmax(0,1fr)]", className)}>
      <svg viewBox="0 0 42 42" className="mx-auto w-full max-w-[220px]" role="img" aria-label="Доли">
        <circle cx="21" cy="21" r={R} fill="transparent" stroke="hsl(var(--muted))" strokeWidth="6" />
        {slices.map((s) => {
          const pct = (s.value / total) * 100;
          /* Зазор 0.6 — тонкая щель цветом подложки между долями. */
          const dash = `${Math.max(pct - 0.6, 0.4)} ${100 - Math.max(pct - 0.6, 0.4)}`;
          const dashOffset = offset;
          offset -= pct;
          const dim = hover !== null && hover !== s.key;
          return (
            <motion.circle
              key={`${gapId}-${s.key}`}
              cx="21"
              cy="21"
              r={R}
              fill="transparent"
              stroke={s.color}
              strokeWidth="6"
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: dim ? 0.25 : 1 }}
              transition={{ duration: reduce ? 0 : motionTokens.duration.fast }}
              style={{ cursor: "pointer" }}
            />
          );
        })}
      </svg>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-overline uppercase text-muted-foreground">
            <th className="pb-2 text-left font-semibold">Страна</th>
            <th className="pb-2 pl-2 text-right font-semibold">Доля</th>
            <th className="pb-2 pl-3 text-right font-semibold">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s) => {
            const pct = Math.round((s.value / total) * 100);
            const dim = hover !== null && hover !== s.key;
            return (
              <tr
                key={s.key}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "border-b border-border/50 transition-opacity last:border-0",
                  dim && "opacity-40"
                )}
              >
                <td className="py-2 pr-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="truncate text-foreground">{s.label}</span>
                  </span>
                </td>
                <td className="py-2 pl-2 text-right tabular-nums text-muted-foreground">{pct}%</td>
                <td className="py-2 pl-3 text-right tabular-nums text-foreground">{s.display}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
