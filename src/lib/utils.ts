import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
  tailwind-merge не знает про наши шкалы из дизайн-системы и разбирает
  `border-hair` как цвет рамки, а не как её толщину, — из-за чего соседний
  `border-border` его вытеснял. Перечисляем свои значения явно.

  Стороны перечислены отдельно: `border-w` покрывает только `border-hair`, и
  без `border-w-b` волосяная линия под строкой таблицы молча пропадала.
*/
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "border-w": [{ border: ["hair", "half"] }],
      "border-w-t": [{ "border-t": ["hair", "half"] }],
      "border-w-r": [{ "border-r": ["hair", "half"] }],
      "border-w-b": [{ "border-b": ["hair", "half"] }],
      "border-w-l": [{ "border-l": ["hair", "half"] }],
      "border-w-x": [{ "border-x": ["hair", "half"] }],
      "border-w-y": [{ "border-y": ["hair", "half"] }],
      rounded: [{ rounded: ["10", "12"] }],
      /* Та же история с кеглем: `text-overline` разбирался как цвет текста, и
         соседний `text-primary` его вытеснял — подпись уезжала на 16px. */
      "font-size": [{ text: ["overline", "h4"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/*
  Названия компаний в выгрузках приходят капсом: 'ТОО "ТЕНГИЗШЕВРОЙЛ"'.
  В таблицах это кричит и читается хуже, поэтому приводим к обычному виду —
  но только на отображении: сами строки остаются ключами навигации и сидами
  для демо-данных, менять их нельзя.
*/

/** Аббревиатуры и правовые формы, которые остаются капсом. */
const KEEP_UPPER = new Set([
  "ТОО",
  "АО",
  "ЗАО",
  "ОАО",
  "ПАО",
  "ИП",
  "СП",
  "ТД",
  "КХ",
  "РГП",
  "ГКП",
  "США",
  "ОАЭ",
  "ЕС",
  "РК",
  "КНР",
  "ЕАЭС",
  "ВТО",
  "ЕТТ",
  "НДС",
  "ТН",
  "ВЭД",
  "LLC",
  "LLP",
  "JSC",
  "GMBH",
]);

/** «ТЕНГИЗШЕВРОЙЛ» → «Тенгизшевройл», «HYUNDAI» → «Hyundai». */
const capitalize = (w: string) =>
  w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/**
 * Название компании для показа: правовая форма и аббревиатуры остаются капсом,
 * остальные слова из капса переводятся в обычный регистр.
 *
 * Приводим только «крикливые» названия — те, где нет ни одной строчной буквы.
 * Разбор по отдельным словам ломал осмысленный регистр: «Siemens AG»
 * превращался в «Siemens Ag», «PepsiCo Inc.» — в «Pepsico Inc.», а
 * «Coca-Cola HBC» — в «Coca-Cola Hbc».
 */
export function companyCase(name: string): string {
  if (/\p{Ll}/u.test(name)) return name;

  return name.replace(/[\p{L}]+/gu, (word) => {
    if (KEEP_UPPER.has(word)) return word;
    // Не капс (есть строчные) — значит регистр уже осмысленный.
    if (word !== word.toUpperCase()) return word;
    // Одиночная буква — инициал, оставляем как есть.
    if (word.length < 2) return word;
    return capitalize(word);
  });
}
