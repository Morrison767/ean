"use client";

/**
 * Поле ввода (shadcn/ui, стили — ДС ADATA).
 *
 * Рамка намеренно темнее border/strong: на белой карточке поле со светло-серой
 * рамкой не читается как поле. Кольцо фокуса — брендовое, 3px, через shadow, а
 * не outline: outline не повторял бы радиус у поля со значком слева.
 */

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Значок слева внутри поля. */
  icon?: LucideIcon;
  /** Контрол справа: кнопка очистки, «показать пароль», счётчик. */
  addon?: React.ReactNode;
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, icon: Icon, addon, invalid, disabled, ...props }, ref) {
    return (
      <div
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-12 border bg-card px-3 shadow-field transition-colors",
          "focus-within:border-primary focus-within:shadow-focus-ring",
          invalid ? "border-danger" : "border-field",
          disabled && "cursor-not-allowed bg-muted opacity-60",
          className
        )}
      >
        {Icon && <Icon className="h-4.5 w-4.5 shrink-0 text-icon" strokeWidth={1.8} />}
        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm text-field-text outline-none",
            "placeholder:text-[hsl(var(--input-helper))] disabled:cursor-not-allowed"
          )}
          {...props}
        />
        {addon}
      </div>
    );
  }
);

/** Многострочное поле — та же рамка и кольцо фокуса, что у однострочного. */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full resize-y rounded-12 border bg-card px-3 py-2 text-sm text-field-text shadow-field outline-none transition-colors",
        "placeholder:text-[hsl(var(--input-helper))]",
        "focus:border-primary focus:shadow-focus-ring",
        invalid ? "border-danger" : "border-field",
        className
      )}
      {...props}
    />
  );
});

/** Подпись над полем. */
export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    >
      {children}
    </label>
  );
}

/** Пояснение или текст ошибки под полем. */
export function FieldHint({
  invalid,
  children,
}: {
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("text-xs", invalid ? "text-danger" : "text-muted-foreground")}>
      {children}
    </span>
  );
}
