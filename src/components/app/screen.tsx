"use client";

/**
 * Обёртка экрана модуля.
 *
 * Появление — короткий сдвиг снизу вверх (screenEnter из токенов движения).
 * Только вход, без exit: уходящий экран ничего не доигрывает, иначе
 * незавершённая анимация задерживает монтирование следующего модуля.
 *
 * Заголовок и подпись живут здесь же: у всех модулей одна шапка, и повторять
 * её разметку в каждом — способ развести отступы по семи местам.
 */

import { motion, useReducedMotion } from "motion/react";

import { screenEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Screen({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Кнопки в правой части шапки экрана. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      {...screenEnter(!!reduce)}
      className={cn("mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 sm:p-6", className)}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title && (
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            )}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}
