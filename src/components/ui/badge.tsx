"use client";

/**
 * Бейдж (shadcn/ui на cva, тона — оттенки hue/* из ДС ADATA).
 *
 * Отдельно вынесен RiskBadge: уровень риска показывается в приложении
 * десятки раз, и подпись с цветом должны совпадать везде до буквы.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/data/types";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-badge text-foreground",
        brand: "bg-accent text-primary",
        success: "bg-success-subtle text-success-foreground",
        warning: "bg-warning-subtle text-warning-foreground",
        danger: "bg-danger-subtle text-danger",
        violet: "bg-hue-violet-subtle text-hue-violet",
        indigo: "bg-hue-indigo-subtle text-hue-indigo",
        teal: "bg-hue-teal-subtle text-hue-teal",
        /** Контурный вариант для плотных таблиц. */
        outline: "border border-border bg-card text-muted-foreground",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        md: "px-2 py-0.5 text-xs",
        lg: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Точка-индикатор слева — как в списке источников данных. */
  dot?: boolean;
}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Подписи и тона уровней риска — единственный источник правды в приложении. */
export const RISK_META: Record<RiskLevel, { label: string; tone: BadgeProps["tone"] }> = {
  none: { label: "Без риска", tone: "success" },
  low: { label: "Низкий риск", tone: "success" },
  medium: { label: "Средний риск", tone: "warning" },
  high: { label: "Высокий риск", tone: "danger" },
  critical: { label: "Критический риск", tone: "danger" },
};

export function RiskBadge({
  level,
  size = "md",
  className,
}: {
  level: RiskLevel;
  size?: BadgeProps["size"];
  className?: string;
}) {
  const meta = RISK_META[level] ?? RISK_META.none;
  return (
    <Badge tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </Badge>
  );
}
