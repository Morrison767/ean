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

/**
 * Кольцо распределения по риску.
 *
 * Уровень риска — состояние, а не одна из категорий, поэтому цвета берутся
 * статусные и закреплены за уровнями. Подставлять сюда категорийную палитру
 * нельзя: синий «высокий риск» рядом с зелёным «без риска» читается ровно
 * наоборот.
 *
 * Проверка палитры на этой тройке даёт ΔE 3.4 между жёлтым и зелёным при
 * протанопии — то есть по одному цвету «средний риск» и «без риска» различит
 * не каждый. Менять оттенки здесь нельзя: те же три цвета носят риск-бейджи по
 * всему приложению, и расхождение кольца с бейджем рядом хуже, чем близость
 * оттенков. Поэтому таблица уровней рядом с кольцом обязательна — она называет
 * каждый уровень словами и даёт число, и цвет ни в одном месте не остаётся
 * единственным носителем смысла. Убирать её из этой формы нельзя.
 */
export const RISK_SHARE_COLOR: Record<string, string> = {
  high: "hsl(var(--hue-red))",
  medium: "hsl(var(--hue-amber))",
  none: "hsl(var(--hue-green))",
};

export interface ShareItem {
  key: string;
  label: string;
  value: number;
  /** Готовая подпись суммы. */
  display: string;
  /** Свой цвет — для статусных шкал, где оттенок закреплён за значением. */
  color?: string;
}

const MAX_SLICES = 6;

export function ShareDonut({
  items,
  emptyText = "Нет операций за период",
  /** Подписи первой и третьей колонок: у страны это «сумма», у риска — «счетов». */
  columns = ["Страна", "Сумма"],
  className,
}: {
  items: ShareItem[];
  emptyText?: string;
  columns?: [string, string];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const gapId = useId();
  const [hover, setHover] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, MAX_SLICES);
  const tail = sorted.slice(MAX_SLICES);
  const slices: Array<ShareItem & { color: string }> = [
    ...head.map((s, i) => ({ ...s, color: s.color ?? SHARE_COLORS[i] })),
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
    <div
      className={cn(
        /* items-start, иначе при двух-трёх долях таблица растягивается по
           высоте кольца и строки расползаются на полкарточки. */
        "grid items-start gap-5 p-4 sm:p-5 lg:grid-cols-[220px_minmax(0,1fr)]",
        className
      )}
    >
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
            <th className="pb-2 text-left font-semibold">{columns[0]}</th>
            <th className="pb-2 pl-2 text-right font-semibold">Доля</th>
            <th className="pb-2 pl-3 text-right font-semibold">{columns[1]}</th>
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
