"use client";

/**
 * Кнопка (shadcn/ui на Radix Slot + cva, стили — дизайн-система ADATA 2026).
 *
 * Размеры повторяют шкалу ДС: xs 24 · sm 32 · md 40 · lg 48. Радиус зависит от
 * размера — маленькая кнопка с 12px выглядела бы переокруглённой.
 *
 * Отклик на нажатие — только transform: он не вызывает пересчёт раскладки и
 * сам отключается при prefers-reduced-motion через вариант motion-safe.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold " +
    "transition-[color,background-color,border-color,transform] duration-150 " +
    "motion-safe:active:scale-[0.97] " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--border-focus))] " +
    "disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active " +
          "disabled:bg-[hsl(var(--action-disabled))] disabled:text-[hsl(var(--action-disabled-fg))]",
        secondary:
          "border border-strong bg-card text-foreground " +
          "hover:border-subtle hover:bg-[hsl(var(--action-secondary-hover))] active:bg-muted " +
          "disabled:border-border disabled:bg-card disabled:text-[hsl(var(--action-disabled-fg-subtle))]",
        ghost:
          "text-primary hover:bg-accent active:bg-brand-100 active:text-brand-700 " +
          "disabled:text-[hsl(var(--action-disabled-fg-subtle))]",
        danger:
          "bg-danger text-danger-foreground hover:bg-danger-hover active:bg-danger-active " +
          "disabled:bg-[hsl(var(--action-disabled))] disabled:text-[hsl(var(--action-disabled-fg))]",
        outline:
          "border border-border bg-background text-foreground " +
          "hover:bg-muted active:bg-secondary [&>svg]:text-icon-brand " +
          "disabled:text-[hsl(var(--action-disabled-fg-subtle))]",
        /** Тихая кнопка внутри карточки: ни рамки, ни заливки до наведения. */
        quiet:
          "text-muted-foreground hover:bg-muted hover:text-foreground " +
          "disabled:text-[hsl(var(--action-disabled-fg-subtle))]",
      },
      size: {
        xs: "h-6 gap-1.5 rounded-sm px-2.5 text-xs",
        sm: "h-8 rounded-10 px-3.5 text-sm",
        md: "h-10 rounded-12 px-4 text-sm",
        lg: "h-12 rounded-12 px-5 text-base",
        /** Квадратные кнопки-иконки той же шкалы. */
        "icon-sm": "h-8 w-8 rounded-10",
        "icon-md": "h-10 w-10 rounded-12",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  }
);

/** Размер значка внутри кнопки — по шкале иконок ДС: 14 / 16 / 18 / 20. */
const ICON_SIZE: Record<string, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-4.5 w-4.5",
  lg: "h-5 w-5",
  "icon-sm": "h-4 w-4",
  "icon-md": "h-4.5 w-4.5",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Отрисовать как дочерний элемент — ссылка со стилями кнопки. */
  asChild?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size = "md",
      block,
      asChild = false,
      icon: Icon,
      iconRight: IconRight,
      loading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) {
    const Comp = asChild ? Slot : "button";
    const iconClass = ICON_SIZE[size ?? "md"];

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn(iconClass, "shrink-0 animate-spin")} />
        ) : (
          Icon && <Icon className={cn(iconClass, "shrink-0")} strokeWidth={2} />
        )}
        {children}
        {IconRight && !loading && (
          <IconRight className={cn(iconClass, "shrink-0")} strokeWidth={2} />
        )}
      </Comp>
    );
  }
);

export interface IconButtonProps
  extends Omit<ButtonProps, "children" | "icon" | "iconRight"> {
  icon: LucideIcon;
  /** Обязателен: кнопка без подписи должна быть названа для скринридера. */
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon: Icon, label, variant = "quiet", size = "icon-md", className, loading, ...props },
    ref
  ) {
    const iconClass = ICON_SIZE[size ?? "icon-md"];
    return (
      <Button
        ref={ref}
        aria-label={label}
        title={label}
        variant={variant}
        size={size}
        loading={loading}
        className={className}
        {...props}
      >
        {!loading && <Icon className={cn(iconClass, "shrink-0")} strokeWidth={2} />}
      </Button>
    );
  }
);
