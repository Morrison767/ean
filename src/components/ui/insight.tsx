"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Вывод из данных, а не показатель.
 *
 * Формулировка обязана быть проверяемой: «на топ-3 приходится 78 % оборота»
 * читается и перепроверяется, «высокая концентрация» — нет.
 */
export function Insight({
  title,
  value,
  detail,
  tone = "neutral",
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "neutral" | "warning" | "danger";
  icon: LucideIcon;
}) {
  const box = {
    neutral: "border-border bg-surface",
    warning: "border-warning/25 bg-warning-subtle",
    danger: "border-danger/25 bg-danger-subtle",
  }[tone];
  const mark = {
    neutral: "text-icon",
    warning: "text-icon-warning",
    danger: "text-icon-danger",
  }[tone];

  return (
    <div className={cn("flex gap-3 rounded-12 border p-3.5", box)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", mark)} strokeWidth={1.8} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{title}</span>
        <span className="text-base font-bold tabular-nums text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}
