"use client";

/**
 * Сгруппированные столбцы: несколько показателей по периодам.
 *
 * Форма и поведение перенесены из прежней версии. Наведение работает по
 * группе, а не по отдельному столбцу: сравнивают показатели внутри периода,
 * поэтому подсказка показывает сразу все ряды, стоит над наведённой группой и
 * центрируется по ней. Остальные группы гаснут до 30 %, подпись периода под
 * наведённой группой становится ярче.
 *
 * Шесть рядов цветом надёжно не разводятся: проверка палитры оставляет
 * предупреждение на паре «зелёный — оранжевый». Поэтому цвет здесь не
 * единственный ключ — легенда на месте, подсказка подписывает каждый ряд
 * словом и значением, а те же числа продублированы таблицами под графиком.
 */

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface Series {
  key: string;
  label: string;
  color: string;
}

export interface GroupRow {
  label: string;
  values: Record<string, number>;
}

/**
 * Проверенный набор (validate_palette): светлая и тёмная тема проходят по
 * светлоте, насыщенности и контрасту к подложке.
 */
export const SERIES_COLORS = [
  "#068DFF",
  "#E17100",
  "#00A63E",
  "#AD46FF",
  "#E7000B",
  "#E60076",
];

const PLOT_H = 224; // 14rem

export function GroupedBars({
  rows,
  series,
  format,
  className,
}: {
  rows: GroupRow[];
  series: Series[];
  format: (v: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  /* Наведённая группа, не столбец: сравнение идёт внутри периода. */
  const [group, setGroup] = useState<number | null>(null);

  const max = Math.max(...rows.flatMap((r) => series.map((s) => r.values[s.key] ?? 0)), 1);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => ({ f, v: max * f }));

  if (rows.length === 0) {
    return (
      <p className={cn("px-4 py-6 text-sm text-muted-foreground sm:px-5", className)}>
        Нет данных за выбранный период
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 p-4 sm:p-5", className)}>
      <div className="relative flex gap-2">
        {/* Ось значений — рецессивная */}
        <div
          className="flex w-[58px] shrink-0 flex-col justify-between text-right text-[11px] leading-none tabular-nums text-muted-foreground"
          style={{ height: PLOT_H }}
        >
          {ticks.map((t) => (
            <span key={t.f}>{format(t.v)}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1" style={{ height: PLOT_H }}>
          {/* Сетка */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((t) => (
              <span key={t.f} className="block h-px w-full bg-border/60" />
            ))}
          </div>

          <div className="relative flex h-full items-end gap-2" role="img" aria-labelledby={titleId}>
            {rows.map((row, ri) => {
              const dim = group !== null && group !== ri;
              return (
                <div
                  key={row.label}
                  onMouseEnter={() => setGroup(ri)}
                  onMouseLeave={() => setGroup(null)}
                  className={cn(
                    "relative flex h-full min-w-0 flex-1 flex-col justify-end transition-colors",
                    ri > 0 && "border-l border-dashed border-border pl-1",
                    group === ri && "bg-surface/60"
                  )}
                >
                  <div className="flex w-full items-end gap-[3px] px-1" style={{ height: "100%" }}>
                    {series.map((s, si) => {
                      const v = row.values[s.key] ?? 0;
                      const pct = (v / max) * 100;
                      return (
                        <motion.div
                          key={s.key}
                          aria-label={`${row.label}, ${s.label}: ${format(v)}`}
                          initial={{ height: reduce ? `${Math.max(pct, v > 0 ? 1.5 : 0)}%` : 0 }}
                          whileInView={{ height: `${Math.max(pct, v > 0 ? 1.5 : 0)}%` }}
                          viewport={{ once: true, amount: 0.4 }}
                          animate={{ opacity: dim ? 0.3 : 1 }}
                          transition={{
                            duration: reduce ? 0 : motionTokens.duration.slow,
                            ease: motionTokens.easing.smooth,
                            delay: reduce ? 0 : si * 0.03 + ri * 0.05,
                          }}
                          className="min-w-0 flex-1 rounded-t-[3px]"
                          style={{ backgroundColor: s.color }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Подсказка над наведённой группой: центрируется по ней и не
              выходит за края графика. */}
          {group !== null && (
            <div
              className="pointer-events-none absolute top-1 z-20 w-max max-w-[240px] -translate-x-1/2 rounded-10 border border-border bg-card/95 p-2.5 shadow-pop-strong backdrop-blur-sm"
              style={{
                left: `${Math.min(82, Math.max(18, ((group + 0.5) / rows.length) * 100))}%`,
              }}
            >
              <div className="mb-1.5 text-xs font-bold text-foreground">{rows[group].label}</div>
              <div className="flex flex-col gap-1">
                {series.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between gap-4 text-xs text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.label}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {format(rows[group].values[s.key] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Подписи периодов: наведённая ярче остальных. */}
      <div className="flex gap-2">
        <div className="w-[58px] shrink-0" />
        <div className="flex flex-1 gap-2">
          {rows.map((row, ri) => (
            <div
              key={row.label}
              className={cn(
                "min-w-0 flex-1 truncate text-center text-xs tabular-nums transition-colors",
                group === ri ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {row.label}
            </div>
          ))}
        </div>
      </div>

      {/* Легенда обязательна: рядов больше одного. */}
      <ul
        id={titleId}
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3"
      >
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
