"use client";

/**
 * Флажок (shadcn/ui на Radix Checkbox, моторика — ДС ADATA).
 *
 * Галочка не появляется мгновенно: пружина snappy отрабатывает прямое
 * действие пользователя живее фиксированной длительности. Сам квадрат меняет
 * заливку через transition-colors — цвет и форма не должны спорить.
 */

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { motion, useReducedMotion } from "motion/react";
import { Check, Minus } from "lucide-react";

import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, checked, ...props }, ref) {
  const reduce = useReducedMotion();
  const indeterminate = checked === "indeterminate";

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      className={cn(
        "peer grid h-4.5 w-4.5 shrink-0 place-items-center rounded-xs border transition-colors",
        "border-field bg-card",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--border-focus))]",
        "disabled:cursor-not-allowed disabled:border-border disabled:bg-muted",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator asChild forceMount>
        <motion.span
          initial={false}
          animate={
            checked
              ? { scale: 1, opacity: 1 }
              : { scale: reduce ? 1 : 0.6, opacity: 0 }
          }
          transition={reduce ? { duration: 0 } : springs.snappy}
          className="grid place-items-center text-primary-foreground"
        >
          {indeterminate ? (
            <Minus className="h-3 w-3" strokeWidth={3} />
          ) : (
            <Check className="h-3 w-3" strokeWidth={3} />
          )}
        </motion.span>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

/** Флажок с подписью: кликабельна вся строка, включая текст. */
export function CheckboxField({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        className="mt-0.5"
      />
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5">
        <span className="text-sm text-foreground">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </label>
    </div>
  );
}
