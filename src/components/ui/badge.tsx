"use client";

/**
 * Бейдж (shadcn/ui на cva, тона — оттенки hue/* из ДС ADATA).
 *
 * Отдельно вынесен RiskBadge: уровень риска показывается в приложении
 * десятки раз, и подпись с цветом должны совпадать везде до буквы.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Tooltip } from "@/components/ui/tooltip";
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
  medium: { label: "Средний риск", tone: "warning" },
  high: { label: "Высокий риск", tone: "danger" },
};

/**
 * Причины уровня риска — текст прежней версии дословно. Показываются в
 * подсказке под бейджем: сам по себе «высокий риск» не говорит, из чего он
 * сложился, и без расшифровки бейдж приходится проверять руками.
 */
export const RISK_REASONS: Record<RiskLevel, string[]> = {
  high: [
    "Завышение/занижение цен в сделках",
    "Связь с лжепредприятием / транзит",
    "Аннулированные или отозванные ЭСФ",
  ],
  medium: ["Отдельные операции требуют проверки", "Отклонение цены 15–30%"],
  none: ["Существенных рисков не выявлено"],
};

/** Расшифровка уровня: бейдж и причины под ним. Общая для бейджа и точки. */
function RiskDetail({ level }: { level: RiskLevel }) {
  const meta = RISK_META[level] ?? RISK_META.none;
  return (
    <div className="flex flex-col gap-1">
      <Badge tone={meta.tone} size="sm" dot className="w-fit">
        {meta.label}
      </Badge>
      <ul className="flex flex-col gap-0.5">
        {(RISK_REASONS[level] ?? RISK_REASONS.none).map((r) => (
          <li key={r} className="text-xs text-muted-foreground">
            • {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RiskBadge({
  level,
  size = "md",
  className,
  /** Отключить подсказку — когда бейдж и так стоит внутри расшифровки. */
  plain = false,
}: {
  level: RiskLevel;
  size?: BadgeProps["size"];
  className?: string;
  plain?: boolean;
}) {
  const meta = RISK_META[level] ?? RISK_META.none;
  const badge = (
    <Badge tone={meta.tone} size={size} dot className={cn(!plain && "cursor-help", className)}>
      {meta.label}
    </Badge>
  );
  if (plain) return badge;
  /* Наведение раскрывает, из чего сложился уровень: сам бейдж этого не говорит. */
  return (
    <Tooltip align="left" content={<RiskDetail level={level} />}>
      {badge}
    </Tooltip>
  );
}

/**
 * Точка риска для плотных строк: в таблице и в списке результатов на бейдж
 * нет места, а знать уровень нужно. Расшифровка та же, что у бейджа.
 */
export function RiskDot({ level, className }: { level: RiskLevel; className?: string }) {
  const meta = RISK_META[level] ?? RISK_META.none;
  const tone = {
    none: "bg-success",
    medium: "bg-warning",
    high: "bg-danger",
  }[level] ?? "bg-success";

  return (
    <Tooltip align="left" content={<RiskDetail level={level} />}>
      <span
        role="img"
        aria-label={meta.label}
        className={cn("size-2 shrink-0 cursor-help rounded-full", tone, className)}
      />
    </Tooltip>
  );
}
