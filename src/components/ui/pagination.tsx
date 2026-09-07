"use client";

/**
 * Постраничный вывод таблиц — перенос из прежней версии.
 *
 * Размеры страницы 20 / 50 / 100, подпись «Показано X–Y из N». Реестры
 * доходят до полусотни строк и в демо, и вырастут на настоящих данных;
 * прежнее приложение их листало, и без этого длинные таблицы ведут себя
 * иначе, чем привык пользователь.
 *
 * При смене выборки или размера страницы возврат на первую: иначе после
 * фильтра человек оказывается на седьмой странице пустого результата.
 */

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export const PAGE_SIZES = [20, 50, 100] as const;

export function usePagination<T>(items: T[], resetKey?: unknown) {
  const [size, setSize] = React.useState<number>(PAGE_SIZES[0]);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [resetKey, size]);

  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const end = Math.min(start + size, items.length);

  return {
    page: current,
    setPage,
    size,
    setSize,
    pages,
    start,
    end,
    total: items.length,
    slice: items.slice(start, end),
  };
}

export function Pagination({
  start,
  end,
  total,
  page,
  pages,
  size,
  onPage,
  onSize,
}: {
  start: number;
  end: number;
  total: number;
  page: number;
  pages: number;
  size: number;
  onPage: (p: number) => void;
  onSize: (s: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        {total === 0 ? (
          "Ничего не найдено"
        ) : (
          <>
            Показано{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {start + 1}–{end}
            </span>{" "}
            из <span className="font-semibold tabular-nums text-foreground">{total}</span>
          </>
        )}
      </span>

      {total > PAGE_SIZES[0] && (
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span>На странице:</span>
            {PAGE_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSize(s)}
                aria-pressed={size === s}
                className={cn(
                  "rounded-sm px-1.5 py-0.5 tabular-nums transition-colors",
                  size === s
                    ? "bg-accent font-semibold text-primary"
                    : "hover:bg-muted hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </span>

          <span className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Предыдущая страница"
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              className="grid h-7 w-7 place-items-center rounded-md transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">
              {page} / {pages}
            </span>
            <button
              type="button"
              aria-label="Следующая страница"
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
              className="grid h-7 w-7 place-items-center rounded-md transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </span>
        </span>
      )}
    </div>
  );
}
