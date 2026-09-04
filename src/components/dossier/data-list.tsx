"use client";

/**
 * Пары «подпись — значение».
 *
 * В досье их сотни, и единственное, что должно совпадать везде, — вертикальный
 * ритм: подпись 12px тихим цветом, значение 14px основным, шаг между парами
 * один. Сетка перестраивается по ширине, а не по числу полей: раздел с двумя
 * полями не должен растягивать их на всю карточку.
 */

import { cn } from "@/lib/utils";

export function DataList({
  className,
  cols = 2,
  children,
}: {
  className?: string;
  /** Сколько колонок на широком экране. */
  cols?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  const grid = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", grid, className)}>
      {children}
    </dl>
  );
}

export function Field({
  label,
  value,
  mono = false,
  accent = false,
  span,
}: {
  label: string;
  value: React.ReactNode;
  /** Моноширинные цифры: ИИН, номера счетов, кадастровые номера. */
  mono?: boolean;
  /** Брендовый цвет — для значений, на которые нужно обратить внимание. */
  accent?: boolean;
  /** Занять две колонки — для длинных значений вроде адреса. */
  span?: 2;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", span === 2 && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "break-words text-sm",
          mono && "tabular-nums",
          accent ? "font-semibold text-primary" : "text-foreground"
        )}
      >
        {value || <span className="text-faint">—</span>}
      </dd>
    </div>
  );
}

/** Заголовок группы полей внутри карточки. */
export function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-overline font-semibold uppercase text-muted-foreground">
      {children}
    </p>
  );
}
