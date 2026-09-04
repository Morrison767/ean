"use client";

/**
 * Таблица (shadcn/ui, стили — ДС ADATA).
 *
 * Строки разделены волосяной линией, а не рамкой: в плотных реестрах рамка
 * даёт сетку, в которой глаз теряет строку. Заголовок — версалы с разрядкой
 * (роль overline из ДС).
 *
 * Обёртка всегда прокручивается вбок: реестры ЭСФ и ВЭД шире экрана, и без
 * своего скролла они растягивали бы страницу.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export function TableWrap({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>{children}</div>
  );
}

export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(function Table({ className, ...props }, ref) {
  return (
    <table
      ref={ref}
      className={cn("w-full caption-bottom border-collapse text-sm", className)}
      {...props}
    />
  );
});

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />;
});

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
});

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(function TableRow({ className, interactive, ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border transition-colors",
        interactive && "cursor-pointer hover:bg-surface",
        className
      )}
      {...props}
    />
  );
});

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(function TableHead({ className, numeric, ...props }, ref) {
  return (
    <th
      ref={ref}
      scope="col"
      className={cn(
        "h-10 whitespace-nowrap px-3 text-overline font-semibold uppercase text-muted-foreground",
        numeric ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  );
});

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(function TableCell({ className, numeric, ...props }, ref) {
  return (
    <td
      ref={ref}
      className={cn(
        "px-3 py-2.5 align-middle text-foreground",
        /* Числа — моноширинные цифры: колонка сумм не «пляшет» по разрядам. */
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  );
});

/** Пустая таблица: сообщение вместо голой сетки. */
export function TableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
