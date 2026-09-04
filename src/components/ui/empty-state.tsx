"use client";

import * as React from "react";
import { Ban, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Заглушка пустого состояния (Figma: Заглушки / Ореол, node 1927:15).
 *
 * Визуал — концентрические кольца вокруг иконки: чип 72px внутри колец 92 и 130,
 * плюс значок-маркер 26px в правом нижнем углу. Кольца нарисованы на CSS,
 * иконки берутся из Lucide.
 */
export function EmptyState({
  icon: Icon,
  badgeIcon: BadgeIcon = Ban,
  title,
  description,
  action,
  bare = false,
  className,
}: {
  icon: LucideIcon;
  /** Маркер поверх иконки: по умолчанию «запрет» — данных нет. */
  badgeIcon?: LucideIcon;
  title: string;
  description?: string;
  /** Кнопка действия — обычно Button variant="secondary" size="md". */
  action?: React.ReactNode;
  /** Без собственной рамки и фона — когда заглушка стоит внутри карточки. */
  bare?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        /* Поля по макету: 40 сверху и снизу, 32 по бокам; шаг между визуалом,
           заголовком, описанием и кнопкой — 16. */
        "flex flex-col items-center justify-center gap-4 px-8 py-10 text-center",
        !bare &&
          "rounded-xl border border-border bg-surface/20",
        className
      )}
    >
      <EmptyStateVisual icon={Icon} badgeIcon={BadgeIcon} />

      <p className="text-h4 font-semibold text-foreground">{title}</p>

      {description && (
        <p className="max-w-[404px] text-sm font-normal text-subtle">
          {description}
        </p>
      )}

      {action}
    </div>
  );
}

/** Только графика — для случаев, когда текст и кнопка верстаются отдельно. */
export function EmptyStateVisual({
  icon: Icon,
  badgeIcon: BadgeIcon = Ban,
  className,
}: {
  icon: LucideIcon;
  badgeIcon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn("relative h-[130px] w-[140px] shrink-0", className)}
      aria-hidden="true"
    >
      {/* Внешнее кольцо и мягкое свечение */}
      <span className="absolute left-1/2 top-1/2 h-[130px] w-[130px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 bg-[radial-gradient(circle,hsl(var(--primary)/0.08),transparent_70%)]" />
      {/* Среднее кольцо */}
      <span className="absolute left-1/2 top-1/2 h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15" />

      {/* Чип с иконкой раздела */}
      <span className="absolute left-1/2 top-1/2 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.28] bg-primary/[0.04]">
        <Icon
          className="absolute left-1/2 top-1/2 h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 text-primary"
          strokeWidth={1.6}
        />
        {/* Маркер «данных нет» */}
        <span className="absolute left-[50px] top-[50px] flex h-[26px] w-[26px] items-center justify-center rounded-full border border-border bg-card">
          <BadgeIcon className="h-3.5 w-3.5 text-icon-secondary" strokeWidth={1.8} />
        </span>
      </span>
    </div>
  );
}
