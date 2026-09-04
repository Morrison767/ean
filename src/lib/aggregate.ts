/**
 * Свёртки для дашбордов модулей.
 *
 * Все реестры сводятся одинаково: сгруппировать по полю, сложить суммы,
 * отсортировать по убыванию. Держим это одной функцией, чтобы «топ
 * контрагентов» в ЭСФ и «топ стран» в ВЭД считались по одному правилу.
 */

export interface Group {
  key: string;
  value: number;
  count: number;
}

/** Сумма `amount` по ключу `key`, тяжёлые сверху. */
export function groupSum<T>(
  items: T[],
  key: (item: T) => string | undefined,
  amount: (item: T) => number
): Group[] {
  const map = new Map<string, Group>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    const prev = map.get(k);
    if (prev) {
      prev.value += amount(it);
      prev.count += 1;
    } else {
      map.set(k, { key: k, value: amount(it), count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

/**
 * Ряд для графика динамики: суммы по периоду в хронологическом порядке.
 * Период берётся из даты вида «18.01.2024» — год или «ММ.ГГГГ».
 */
export function byPeriod<T>(
  items: T[],
  date: (item: T) => string | undefined,
  amount: (item: T) => number,
  grain: "year" | "month" = "year"
): Group[] {
  const map = new Map<string, Group>();
  for (const it of items) {
    const d = date(it);
    if (!d) continue;
    const m = /^(?:(\d{2})\.)?(\d{2})\.(\d{4})$/.exec(d);
    if (!m) continue;
    const [, , mm, yyyy] = m;
    const k = grain === "year" ? yyyy : `${mm}.${yyyy}`;
    const prev = map.get(k);
    if (prev) {
      prev.value += amount(it);
      prev.count += 1;
    } else {
      map.set(k, { key: k, value: amount(it), count: 1 });
    }
  }
  /* Хронология, а не величина: это ось времени. */
  return [...map.values()].sort((a, b) => {
    const norm = (s: string) => (s.includes(".") ? s.split(".").reverse().join("") : s);
    return norm(a.key).localeCompare(norm(b.key));
  });
}
