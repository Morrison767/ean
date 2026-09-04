"use client";

/**
 * Плитка показателя.
 *
 * Наведение подсвечивает рамку, значок и цифры брендовым и слегка приподнимает
 * карточку — отклик одинаковый во всех разделах, а не свой в каждом (правило
 * .kpi-tile из ДС). Значение набегает от нуля: показатель — главное на плитке,
 * и движение ведёт к нему взгляд.
 */

import type { LucideIcon } from "lucide-react";

import { Counter } from "@/components/ui/counter";
import { cn } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  /** Готовая строка показателя: «4 812 394», «18 млрд ₸», «61 %». */
  value: string;
  icon: LucideIcon;
  tone?: "brand" | "danger" | "success" | "warning";
  className?: string;
}) {
  const tones = {
    brand: "bg-accent text-primary",
    danger: "bg-danger-subtle text-danger-foreground",
    success: "bg-success-subtle text-success-foreground",
    warning: "bg-warning-subtle text-warning-foreground",
  } as const;

  return (
    <div
      className={cn(
        "kpi-tile flex flex-col gap-3 rounded-2xl border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-10", tones[tone])}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
      </div>
      <span className="text-2xl font-bold tabular-nums text-foreground">
        <Counter value={value} />
      </span>
    </div>
  );
}
