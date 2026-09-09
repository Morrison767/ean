/**
 * Разбор трудовой биографии.
 *
 * Из списка договоров надо получить то, что аналитик всё равно посчитает
 * руками: сколько человек отработал, где задержался, когда не работал нигде и
 * где записи накладываются друг на друга. Считаем это здесь, чтобы карточка
 * показывала выводы, а не заставляла складывать даты глазами.
 */

import { plural } from "@/lib/format";
import type { Employment } from "@/data/types";

/**
 * Дата выгрузки из реестра.
 *
 * Открытый договор длится «до сегодня», но «сегодня» у прототипа плавает: одна
 * и та же карточка завтра покажет другой стаж. Реестровая выгрузка — снимок на
 * дату, поэтому и считаем к дате снимка. Та же дата стоит в записи источника.
 */
export const AS_OF = "20.06.2026";

/** «01.02.2021» → Date. Ничего другого в фикстурах не встречается. */
export function parseDate(value?: string): Date | null {
  if (!value) return null;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

const AS_OF_DATE = parseDate(AS_OF) as Date;

/** Целых месяцев между датами, с округлением вниз. */
export function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(months, 0);
}

/** «4 года 5 месяцев». Ноль месяцев — «меньше месяца», а не пустая строка. */
export function humanMonths(months: number): string {
  if (months <= 0) return "меньше месяца";
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} ${plural(y, "год", "года", "лет")}`);
  if (m) parts.push(`${m} ${plural(m, "месяц", "месяца", "месяцев")}`);
  return parts.join(" ");
}

export interface Period {
  from: Date;
  to: Date;
  /** Договор ещё действует на дату выгрузки. */
  open: boolean;
}

export function periodOf(record: Employment): Period | null {
  const from = parseDate(record.start);
  if (!from) return null;
  const end = parseDate(record.end);
  return { from, to: end ?? AS_OF_DATE, open: !end };
}

/** Длительность одной записи в месяцах. */
export const durationOf = (record: Employment): number => {
  const p = periodOf(record);
  return p ? monthsBetween(p.from, p.to) : 0;
};

/** Отрезок без работы между записями. */
export interface Gap {
  from: Date;
  to: Date;
  months: number;
}

export interface EmploymentSummary {
  /** Записи в хронологическом порядке, свежие сверху. */
  records: Employment[];
  /** Действующие на дату выгрузки. */
  active: Employment[];
  /**
   * Общий стаж в месяцах по объединённым отрезкам: две параллельные записи —
   * это один и тот же календарный срок, а не двойной стаж.
   */
  totalMonths: number;
  employers: number;
  /** Работодатель с наибольшим суммарным сроком. */
  longest?: { company: string; months: number };
  /** Перерывы длиннее месяца — короткие разрывы это оформление, а не простой. */
  gaps: Gap[];
  /** Пары записей, действовавших одновременно. */
  overlaps: Array<[Employment, Employment]>;
  first?: Date;
  /**
   * Сколько человек не работает на дату выгрузки.
   *
   * Это не «перерыв» — тот всегда между двумя записями и уже закончился.
   * Незакрытый хвост говорит о настоящем, а не о прошлом, и для проверяемого
   * субъекта значит больше любого разрыва в середине биографии.
   */
  idle?: { since: Date; months: number };
}

export function summarize(list: Employment[] = []): EmploymentSummary {
  const withPeriod = list
    .map((r) => ({ r, p: periodOf(r) }))
    .filter((x): x is { r: Employment; p: Period } => x.p !== null)
    .sort((a, b) => a.p.from.getTime() - b.p.from.getTime());

  /* Объединяем пересекающиеся отрезки: стаж — это календарное время, а не
     сумма договоров. Иначе совместительство удваивает результат. */
  const merged: Period[] = [];
  for (const { p } of withPeriod) {
    const last = merged[merged.length - 1];
    if (last && p.from.getTime() <= last.to.getTime()) {
      if (p.to > last.to) last.to = p.to;
      continue;
    }
    merged.push({ ...p });
  }

  const gaps: Gap[] = [];
  for (let i = 1; i < merged.length; i += 1) {
    const months = monthsBetween(merged[i - 1].to, merged[i].from);
    if (months >= 1) gaps.push({ from: merged[i - 1].to, to: merged[i].from, months });
  }

  const overlaps: Array<[Employment, Employment]> = [];
  for (let i = 0; i < withPeriod.length; i += 1) {
    for (let j = i + 1; j < withPeriod.length; j += 1) {
      const a = withPeriod[i];
      const b = withPeriod[j];
      if (b.p.from < a.p.to && a.p.from < b.p.to) overlaps.push([a.r, b.r]);
    }
  }

  const byCompany = new Map<string, number>();
  for (const { r } of withPeriod) {
    byCompany.set(r.company, (byCompany.get(r.company) ?? 0) + durationOf(r));
  }
  const longest = [...byCompany.entries()].sort((a, b) => b[1] - a[1])[0];

  const last = merged[merged.length - 1];
  const idle =
    last && !withPeriod.some((x) => x.p.open) && monthsBetween(last.to, AS_OF_DATE) >= 1
      ? { since: last.to, months: monthsBetween(last.to, AS_OF_DATE) }
      : undefined;

  return {
    records: withPeriod.map((x) => x.r).reverse(),
    active: withPeriod.filter((x) => x.p.open).map((x) => x.r),
    totalMonths: merged.reduce((s, p) => s + monthsBetween(p.from, p.to), 0),
    employers: byCompany.size,
    longest: longest ? { company: longest[0], months: longest[1] } : undefined,
    gaps,
    overlaps,
    first: merged[0]?.from,
    idle,
  };
}

const PAD = (n: number) => String(n).padStart(2, "0");

/** Date → «01.02.2021»: обратно в тот же вид, в каком лежит в данных. */
export const formatDate = (d: Date): string =>
  `${PAD(d.getDate())}.${PAD(d.getMonth() + 1)}.${d.getFullYear()}`;
