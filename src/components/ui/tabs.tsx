"use client";

/**
 * Вкладки (shadcn/ui на Radix Tabs, моторика — ДС ADATA).
 *
 * Radix даёт роли и клавиатуру (стрелки, Home/End), ДС — вид и движение:
 * индикатор общий между вкладками через layoutId, поэтому при переключении он
 * переезжает, а не мигает на новом месте. Пружина одна на все «переезжающие»
 * подложки приложения — pillSpring.
 */

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";

import { useKeepTabInView } from "@/lib/keep-tab-in-view";
import { pillSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
  disabled?: boolean;
};

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

/** Ряд вкладок с подчёркиванием: индикатор 2px, базовая линия 1px. */
export function UnderlineTabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const groupId = React.useId();
  /* Активная вкладка подтягивается в видимую часть ряда: семь разделов досье
     не помещаются в колонку, и выбранный мог оказаться за краем. */
  const rowRef = useKeepTabInView<HTMLDivElement>(value);

  return (
    <TabsPrimitive.Root value={value} onValueChange={onChange} className={cn("flex flex-col", className)}>
      <TabsPrimitive.List
        ref={rowRef}
        className="flex items-start gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((t) => {
          const active = t.id === value;
          const Icon = t.icon;
          return (
            <TabsPrimitive.Trigger
              key={t.id}
              value={t.id}
              disabled={t.disabled}
              className="flex shrink-0 flex-col items-center gap-2 disabled:pointer-events-none disabled:text-faint"
            >
              <span
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap text-sm transition-colors",
                  active ? "font-semibold text-primary" : "font-normal text-subtle hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />}
                {t.label}
                {typeof t.count === "number" && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                      active ? "bg-accent text-primary" : "bg-badge text-foreground"
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </span>
              <span className="relative h-0.5 w-full">
                {active && (
                  <motion.span
                    layoutId={`tab-underline-${groupId}`}
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={reduce ? { duration: 0 } : pillSpring}
                  />
                )}
              </span>
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      <span className="h-px w-full bg-muted" />
    </TabsPrimitive.Root>
  );
}

/** Сегментированный переключатель: пилюли в общей подложке. */
export function SegmentedControl({
  items,
  value,
  onChange,
  stretch = false,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  stretch?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const groupId = React.useId();
  const rowRef = useKeepTabInView<HTMLDivElement>(value);

  return (
    <TabsPrimitive.Root value={value} onValueChange={onChange} asChild>
      <TabsPrimitive.List
        ref={rowRef}
        className={cn(
          "items-center gap-1 rounded-10 bg-muted p-1",
          stretch ? "flex w-full" : "inline-flex",
          "max-sm:w-full max-sm:overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden",
          className
        )}
      >
        {items.map((t) => {
          const active = t.id === value;
          const Icon = t.icon;
          return (
            <TabsPrimitive.Trigger
              key={t.id}
              value={t.id}
              disabled={t.disabled}
              className={cn(
                /* Начертание одно на все состояния: при переключении с normal
                   на medium подпись становилась шире и коробка дёргалась. */
                "relative flex h-[33px] items-center gap-1.5 rounded-md px-3 text-sm font-medium leading-5 transition-colors disabled:pointer-events-none disabled:text-faint",
                stretch ? "min-w-0 flex-1 justify-center" : "shrink-0 whitespace-nowrap",
                active ? "text-foreground" : "text-subtle hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId={`seg-pill-${groupId}`}
                  className="absolute inset-0 rounded-md bg-card shadow-segment"
                  transition={reduce ? { duration: 0 } : pillSpring}
                />
              )}
              <span className="relative flex min-w-0 items-center gap-1.5">
                {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />}
                <span className={cn(stretch && "min-w-0 truncate")}>{t.label}</span>
                {typeof t.count === "number" && (
                  <span
                    className={cn(
                      "rounded-sm px-1.5 text-xs font-semibold tabular-nums",
                      active ? "bg-accent text-primary" : "bg-badge text-foreground"
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </span>
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}

/**
 * Пилюля-фильтр со счётчиком. Вне Radix намеренно: это не вкладки, а набор
 * независимых переключателей, и роль tab у них была бы враньём.
 */
export function FilterPill({
  label,
  count,
  selected = false,
  onClick,
  className,
}: {
  label: string;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 rounded-10 border px-3 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-accent text-primary"
          : "border-border bg-card text-foreground hover:border-strong",
        className
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className="rounded-sm bg-foreground/10 px-1.5 text-xs font-semibold tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
