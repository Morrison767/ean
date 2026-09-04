"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, type LucideIcon } from "lucide-react";

import { motionTokens } from "@/lib/motion";

import { cn } from "@/lib/utils";

/**
 * Карточка раздела по макету Figma (2235:1087, 2239:1397): шапка с иконкой,
 * заголовком, подзаголовком и шевроном для сворачивания. Содержимое и его
 * отступы задаёт вызывающий код. С `collapsible={false}` шапка становится
 * обычным заголовком: ни шеврона, ни кнопки.
 */
export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  defaultOpen = true,
  collapsible = true,
  action,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  /** Контрол в правой части шапки вместо шеврона (фильтр, переключатель). */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const shown = collapsible ? open : true;

  const head = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-10 bg-accent text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-base font-semibold text-foreground">{title}</span>
        {subtitle && (
          // Названия из ТН ВЭД бывают на несколько строк: держим две,
          // полный текст остаётся в подсказке.
          <span
            title={subtitle}
            className="line-clamp-2 text-xs text-muted-foreground"
          >
            {subtitle}
          </span>
        )}
      </span>
    </>
  );

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface/20",
        className
      )}
    >
      {/* Шапка по макету аккордеона ДС (узел 297:3906): отступы 20/18, шеврон
          20px, разделитель — линия bg/muted, а не рамка. */}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-3 py-3 pl-4 pr-4 text-left transition-colors hover:bg-muted/40 sm:pl-5 sm:pr-[18px]",
            open && "border-b border-border"
          )}
        >
          {head}
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
            strokeWidth={1.5}
          />
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-b border-border py-3 pl-4 pr-4 sm:pl-5 sm:pr-[18px]">
          {head}
          {/* На телефоне контрол встаёт под заголовок и занимает ширину
              карточки: в одной строке со значком и подписью ему остаётся
              полсотни пикселей, и он наезжал на заголовок. */}
          {action && (
            <div className="shrink-0 max-sm:w-full">{action}</div>
          )}
        </div>
      )}

      {/*
        Раскрытие — анимация высоты (accordion). Высота единственное, что
        здесь можно анимировать: содержимое заранее не измерено, а auto
        Motion считает сам. Блок один, поэтому mode="wait" не нужен.
      */}
      <AnimatePresence initial={false}>
        {shown && (
          <motion.div
            key="body"
            initial={{ height: reduce ? "auto" : 0, opacity: reduce ? 1 : 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: reduce ? "auto" : 0, opacity: reduce ? 1 : 0 }}
            transition={{
              duration: reduce ? 0 : motionTokens.duration.normal,
              ease: motionTokens.easing.smooth,
            }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
