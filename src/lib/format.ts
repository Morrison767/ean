/**
 * Форматирование чисел и дат.
 *
 * Суммы в реестрах доходят до миллиардов тенге, и полная запись ломает
 * колонку. Поэтому две функции: `money` — короткая форма для плиток и
 * карточек, `moneyFull` — точная для таблиц, где значения сравнивают между
 * собой. Разделитель разрядов — неразрывный пробел, иначе число переносится
 * посередине.
 */

const NBSP = " ";

/** Разряды неразрывными пробелами: 1234567 → «1 234 567». */
export function num(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Короткая сумма: «18 млрд ₸», «890 млн ₸», «26 тыс ₸». */
export function money(value: number, currency = "₸"): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const fmt = (v: number, unit: string) => {
    /* Один знак после запятой только когда он что-то добавляет: «1,5 млрд»
       информативнее «2 млрд», а «18,0 млрд» — нет. */
    const rounded = Math.round(v * 10) / 10;
    const body = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(".", ",");
    return `${sign}${body}${NBSP}${unit}${NBSP}${currency}`;
  };
  if (abs >= 1e9) return fmt(abs / 1e9, "млрд");
  if (abs >= 1e6) return fmt(abs / 1e6, "млн");
  if (abs >= 1e4) return fmt(abs / 1e3, "тыс");
  return `${sign}${num(abs)}${NBSP}${currency}`;
}

/** Точная сумма для таблиц: «890 000 000 ₸». */
export function moneyFull(value: number, currency = "₸"): string {
  return `${num(value)}${NBSP}${currency}`;
}

/** Доллары — в реестре ВЭД стоимость приходит в USD. */
export const usd = (value: number): string => `$${num(value)}`;

/** Процент с одним знаком: «78 %», «12,5 %». */
export function percent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const body = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
  return `${body}${NBSP}%`;
}

/**
 * Дата из фикстур приходит строкой «18.01.2024». Для сортировки нужен
 * сравнимый вид, поэтому переворачиваем в ISO-подобный ключ.
 */
export function dateKey(value: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(value);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : value;
}

/** Склонение по числу: plural(3, 'запись', 'записи', 'записей'). */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** «12 деклараций» — число вместе со склонённым словом. */
export const counted = (n: number, one: string, few: string, many: string): string =>
  `${num(n)}${NBSP}${plural(n, one, few, many)}`;
