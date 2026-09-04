/**
 * Ряды дашборда ЭСФ — перенос расчёта из прежней версии без изменений.
 *
 * Из настоящих данных берутся только реализация и приобретения: это суммы
 * счетов-фактур по месяцам. Налоги, ФОТ, доход и расход прежнее приложение
 * не хранило, а выводило от БИН детерминированным генератором — одна и та же
 * организация всегда даёт одни и те же цифры. Повторяем формулу как есть:
 * иначе демонстрация перестанет совпадать сама с собой между запусками, а
 * числа на дашборде разойдутся с тем, что показывали заказчику.
 *
 * Годы фиксированы, как и в оригинале: демо-данные размечены под них.
 */

import type { Invoice } from "@/data/types";

export const ESF_YEARS = [2021, 2022, 2023] as const;

export const ESF_MONTHS = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

/** Ряды и их порядок — как в прежней версии. */
export const ESF_SERIES_KEYS = [
  "sales",
  "purchases",
  "taxes",
  "payroll",
  "income",
  "expenses",
] as const;

export type EsfSeriesKey = (typeof ESF_SERIES_KEYS)[number];

export const ESF_SERIES_LABEL: Record<EsfSeriesKey, string> = {
  sales: "Реализация",
  purchases: "Приобретения",
  taxes: "Налоги",
  payroll: "ФОТ",
  income: "Доход",
  expenses: "Расход",
};

type Grid = number[][]; // [год][месяц]

const emptyGrid = (): Grid => ESF_YEARS.map(() => Array(12).fill(0));

export interface EsfSeries {
  sales: Grid;
  purchases: Grid;
  taxes: Grid;
  payroll: Grid;
  income: Grid;
  expenses: Grid;
  /** Количество счетов-фактур по [году][месяцу]. */
  counts: Grid;
}

/**
 * Расчёт рядов для контрагента.
 *
 * @param bin   БИН — он же зерно генератора
 * @param total оборот контрагента: от него отсчитывается масштаб выдуманных рядов
 * @param rows  счета-фактуры, где контрагент участвует
 */
export function buildEsfSeries(bin: string, total: number, rows: Invoice[]): EsfSeries {
  const seed = [...bin].reduce((s, ch) => s + ch.charCodeAt(0), 0);

  /* Псевдослучайное число в [0,1) — дробная часть синуса, как в оригинале. */
  const rnd = (y: number, m: number, k: number) => {
    const v = Math.sin(seed * 7.13 + y * 41.7 + m * 11.3 + k * 101.1) * 1e4;
    return v - Math.floor(v);
  };

  const sales = emptyGrid();
  const purchases = emptyGrid();
  const counts = emptyGrid();

  for (const row of rows) {
    const [, mm, yyyy] = row.date.split(".").map(Number);
    const yi = ESF_YEARS.indexOf(yyyy as (typeof ESF_YEARS)[number]);
    if (yi < 0 || !mm) continue;
    if (row.supplierBin === bin) sales[yi][mm - 1] += row.amount;
    if (row.customerBin === bin) purchases[yi][mm - 1] += row.amount;
    counts[yi][mm - 1] += 1;
  }

  /* Масштаб выдуманных рядов: треть оборота, но не меньше 60 млн. */
  const base = Math.max(total / 3, 6e7);
  const derived = (factor: number, k: number): Grid =>
    ESF_YEARS.map((_, yi) =>
      Array.from({ length: 12 }, (_, mi) =>
        Math.round(((base * factor) / 12) * (0.5 + rnd(yi, mi, k) * 1.1))
      )
    );

  return {
    sales,
    purchases,
    counts,
    income: derived(0.95, 5),
    expenses: derived(0.72, 6),
    taxes: derived(0.11, 3),
    payroll: derived(0.22, 4),
  };
}

export interface Bucket {
  label: string;
  yearIndex: number;
  months: number[];
}

/**
 * Разбиение периода на столбцы графика: «за всё время» — по годам, выбранный
 * год — по кварталам или месяцам.
 */
export function esfBuckets(year: "all" | number, grain: "quarter" | "month"): Bucket[] {
  const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  if (year === "all") {
    return ESF_YEARS.map((y, yi) => ({ label: String(y), yearIndex: yi, months: all }));
  }
  const yi = ESF_YEARS.indexOf(year as (typeof ESF_YEARS)[number]);
  if (yi < 0) return [];
  if (grain === "month") {
    return ESF_MONTHS.map((label, mi) => ({ label, yearIndex: yi, months: [mi] }));
  }
  return [0, 1, 2, 3].map((q) => ({
    label: `${q + 1} кв`,
    yearIndex: yi,
    months: [q * 3, q * 3 + 1, q * 3 + 2],
  }));
}

/** Сумма ряда по корзине. */
export const bucketSum = (grid: Grid, b: Bucket): number =>
  b.months.reduce((s, m) => s + (grid[b.yearIndex]?.[m] ?? 0), 0);

/** Сумма ряда за весь выбранный период. */
export const periodSum = (grid: Grid, buckets: Bucket[]): number =>
  buckets.reduce((s, b) => s + bucketSum(grid, b), 0);
