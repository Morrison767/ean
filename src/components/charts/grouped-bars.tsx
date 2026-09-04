"use client";

/**
 * Сгруппированные столбцы: несколько показателей по годам.
 *
 * Форма взята из прежней версии — там это «реальные операции (ЭСФ) и
 * декларации (ФНО)» одной картиной, и разносить их по отдельным графикам
 * значило бы менять сценарий, а не оформление.
 *
 * Шесть рядов цветом надёжно не разводятся: проверка палитры показывает, что
 * для дейтераномалии пара «зелёный — оранжевый» на грани (ΔE 7), а красный с
 * розовым близки и для обычного зрения. Поэтому цвет здесь не единственный
 * ключ: легенда всегда на месте, при наведении столбец подписан рядом и
 * значением, а те же числа продублированы таблицами под графиком.
 */

import { useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface Series {
  key: string;
  label: string;
  /** Цвет ряда — из проверенного набора SERIES_COLORS. */
  color: string;
}

export interface GroupRow {
  /** Подпись группы: год. */
  label: string;
  values: Record<string, number>;
}

/**
 * Проверенный набор (validate_palette): светлая и тёмная тема проходят по
 * светлоте, насыщенности и контрасту к подложке; предупреждение остаётся на
 * паре «зелёный — оранжевый», что допустимо при вторичном кодировании.
 */
export const SERIES_COLORS = [
  "#068DFF",
  "#E17100",
  "#00A63E",
  "#AD46FF",
  "#E7000B",
  "#E60076",
];

export function GroupedBars({
  rows,
  series,
  format,
  className,
}: {
  rows: GroupRow[];
  series: Series[];
  /** Формат подписи значения в подсказке и на оси. */
  format: (v: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const [hover, setHover] = useState<{ row: number; key: string } | null>(null);

  const max = useMemo(
    () => Math.max(...rows.flatMap((r) => series.map((s) => r.values[s.key] ?? 0)), 1),
    [rows, series]
  );

  /* Четыре деления: больше на графике такой высоты не читается. */
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, v: max * f }));

  if (rows.length === 0) {
    return (
      <p className={cn("px-4 py-6 text-sm text-muted-foreground sm:px-5", className)}>
        Нет данных за выбранный период
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4 sm:p-5", className)}>
      <div className="relative flex gap-3">
        {/* Ось значений — рецессивная, подписи мелкие */}
        <div className="relative h-56 w-16 shrink-0">
          {ticks.map((t) => (
            <span
              key={t.f}
              className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
              style={{ bottom: `${t.f * 100}%` }}
            >
              {format(t.v)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Сетка */}
          {ticks.map((t) => (
            <span
              key={t.f}
              aria-hidden="true"
              className="absolute left-0 right-0 border-t border-border"
              style={{ bottom: `calc(${t.f} * 14rem)` }}
            />
          ))}

          <div className="flex h-56 items-end gap-6" role="img" aria-labelledby={titleId}>
            {rows.map((row, ri) => (
              <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                {/* 2px зазор между столбцами внутри группы даёт разделение
                    даже когда соседние цвета сливаются. */}
                <div className="flex h-56 w-full items-end justify-center gap-0.5">
                  {series.map((s, si) => {
                    const v = row.values[s.key] ?? 0;
                    const on = hover?.row === ri && hover.key === s.key;
                    return (
                      <motion.button
                        key={s.key}
                        type="button"
                        aria-label={`${row.label}, ${s.label}: ${format(v)}`}
                        onPointerEnter={() => setHover({ row: ri, key: s.key })}
                        onPointerLeave={() => setHover(null)}
                        onFocus={() => setHover({ row: ri, key: s.key })}
                        onBlur={() => setHover(null)}
                        initial={{ height: reduce ? `${(v / max) * 100}%` : 0 }}
                        whileInView={{ height: `${(v / max) * 100}%` }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{
                          duration: reduce ? 0 : motionTokens.duration.slow,
                          ease: motionTokens.easing.smooth,
                          delay: reduce ? 0 : si * 0.03 + ri * 0.05,
                        }}
                        className="min-h-[2px] w-full max-w-8 rounded-t-[4px] transition-opacity"
                        style={{
                          backgroundColor: s.color,
                          opacity: hover && !on ? 0.35 : 1,
                        }}
                      />
                    );
                  })}
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{row.label}</span>
              </div>
            ))}
          </div>
        </div>

        {hover && (
          <div className="pointer-events-none absolute right-0 top-0 rounded-10 border border-border bg-card px-2.5 py-1.5 shadow-pop">
            <div className="text-xs text-muted-foreground">
              {rows[hover.row].label} · {series.find((s) => s.key === hover.key)?.label}
            </div>
            <div className="text-sm font-semibold tabular-nums text-foreground">
              {format(rows[hover.row].values[hover.key] ?? 0)}
            </div>
          </div>
        )}
      </div>

      {/* Легенда обязательна: рядов больше одного. */}
      <ul id={titleId} className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
