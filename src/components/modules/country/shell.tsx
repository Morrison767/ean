"use client";

/**
 * Общие элементы страновых сводок.
 *
 * Сводка отвечает на другой вопрос, чем модуль: не «что с этим субъектом», а
 * «что происходит в целом». Поэтому наверху крупные числа, а под ними —
 * выводы, а не просто ещё таблицы: концентрация оборота, доля риска, перекос
 * по товару. Голая витрина показателей такой картины не даёт.
 */

import type { LucideIcon } from "lucide-react";

import { Counter } from "@/components/ui/counter";
import { Insight } from "@/components/ui/insight";
import { cn } from "@/lib/utils";

/** Крупный показатель шапки сводки. */
export function HeroStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "danger" | "success";
}) {
  const accent = {
    default: "text-foreground",
    danger: "text-danger",
    success: "text-success-foreground",
  }[tone];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-icon-secondary" strokeWidth={1.8} />
      </span>
      <span className={cn("text-2xl font-bold tabular-nums", accent)}>
        <Counter value={value} />
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/**
 * Доля топ-N в общей сумме — самая говорящая величина в реестре: она сразу
 * показывает, распределён рынок или держится на нескольких участниках.
 */
export function concentration(values: number[], top = 3): { share: number; total: number } {
  const total = values.reduce((s, v) => s + v, 0);
  if (!total) return { share: 0, total: 0 };
  const head = [...values].sort((a, b) => b - a).slice(0, top).reduce((s, v) => s + v, 0);
  return { share: (head / total) * 100, total };
}

/* Карточка вывода переехала в ui: её показывают и страновые сводки, и досье. */
export { Insight };
