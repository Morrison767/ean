"use client";

/**
 * Общая обвязка реестра.
 *
 * Пять разделов (Выписки, ЭСФ, Закупки, ВЭД, Журнал) устроены одинаково:
 * показатели сверху, строка поиска с фильтром по риску, таблица. Различаются
 * только колонки — их задаёт вызывающий модуль. Держим каркас здесь, чтобы
 * поиск и фильтр вели себя во всех реестрах одинаково.
 */

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/tabs";
import { Table, TableBody, TableHeader, TableRow, TableWrap } from "@/components/ui/table";
import { counted } from "@/lib/format";
import type { RiskLevel } from "@/data/types";

export type RiskFilter = "all" | "risky" | "clean";

/**
 * Фокус на субъекте из адреса (?focus=…).
 *
 * Читаем из location, а не через useSearchParams: тот требует границы
 * Suspense у всей страницы, а нужен здесь только начальный текст фильтра.
 * На сервере параметра нет — поэтому берём его после монтирования.
 */
export function useFocusParam(): string {
  const [focus, setFocus] = useState("");
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("focus");
    if (v) setFocus(v);
  }, []);
  return focus;
}

export function useRegistryFilter<T extends { risk?: RiskLevel }>(
  items: T[],
  /** Поля, по которым идёт текстовый поиск. */
  searchable: (item: T) => Array<string | number | undefined>
) {
  const focus = useFocusParam();
  const [term, setTerm] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");

  /* Переход из досье («Открыть в модуле …») приносит субъект в адресе —
     подставляем его в поиск, чтобы модуль открылся уже отфильтрованным. */
  useEffect(() => {
    if (focus) setTerm(focus);
  }, [focus]);

  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    return items.filter((it) => {
      if (risk === "risky" && (!it.risk || it.risk === "none")) return false;
      if (risk === "clean" && it.risk && it.risk !== "none") return false;
      if (!q) return true;
      return searchable(it).some((v) => v != null && String(v).toLowerCase().includes(q));
    });
    // searchable пересоздаётся каждый рендер — в зависимости не берём.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, term, risk]);

  const counts = useMemo(
    () => ({
      all: items.length,
      risky: items.filter((i) => i.risk && i.risk !== "none").length,
      clean: items.filter((i) => !i.risk || i.risk === "none").length,
    }),
    [items]
  );

  return { term, setTerm, risk, setRisk, filtered, counts };
}

export function RegistryToolbar({
  term,
  onTerm,
  risk,
  onRisk,
  counts,
  placeholder,
}: {
  term: string;
  onTerm: (v: string) => void;
  risk: RiskFilter;
  onRisk: (v: RiskFilter) => void;
  counts: { all: number; risky: number; clean: number };
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input
        icon={Search}
        value={term}
        onChange={(e) => onTerm(e.target.value)}
        placeholder={placeholder}
        className="sm:max-w-md"
      />
      <SegmentedControl
        value={risk}
        onChange={(v) => onRisk(v as RiskFilter)}
        items={[
          { id: "all", label: "Все", count: counts.all },
          { id: "risky", label: "С риском", count: counts.risky },
          { id: "clean", label: "Без риска", count: counts.clean },
        ]}
      />
    </div>
  );
}

export function RegistryTable({
  head,
  rows,
  empty,
  total,
  unit,
}: {
  head: React.ReactNode;
  /** Строки массивом: обвязка сама режет их на страницы. */
  rows: React.ReactNode[];
  /** Показывается вместо таблицы, когда после фильтра ничего не осталось. */
  empty: { title: string; description?: string };
  total: number;
  unit: [string, string, string];
}) {
  /* Ключ сброса — длина выборки: после фильтра страница возвращается к первой. */
  const page = usePagination(rows, rows.length);

  if (total === 0) {
    return <EmptyState icon={Search} title={empty.title} description={empty.description} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">
        Всего {counted(total, ...unit)}
      </span>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>{head}</TableRow>
            </TableHeader>
            <TableBody>{page.slice}</TableBody>
          </Table>
        </TableWrap>
        <div className="border-t border-border px-4 py-2.5">
          <Pagination
            start={page.start}
            end={page.end}
            total={page.total}
            page={page.page}
            pages={page.pages}
            size={page.size}
            onPage={page.setPage}
            onSize={page.setSize}
          />
        </div>
      </div>
    </div>
  );
}
