"use client";

import * as React from "react";

/**
 * Подтянуть элемент в видимую часть его горизонтальной прокрутки.
 *
 * scrollIntoView здесь не годится: он двигает все прокручиваемые предки, то
 * есть заодно и вертикальную прокрутку экрана — ряд вкладок приезжает, а
 * страница под ним прыгает. Считаем сдвиг сами и двигаем только сам ряд.
 */
export function keepInViewX(
  el: HTMLElement | null,
  row: HTMLElement | null,
  pad = 12
): void {
  if (!el || !row) return;
  // Ряд помещается целиком — двигать нечего.
  if (row.scrollWidth <= row.clientWidth) return;

  const item = el.getBoundingClientRect();
  const view = row.getBoundingClientRect();
  const behavior: ScrollBehavior = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches
    ? "auto"
    : "smooth";

  /* Отступ pad оставляет у края намёк на соседнюю вкладку: без него
     выбранная встаёт вплотную к границе и ряд не выглядит прокручиваемым. */
  const overRight = item.right - (view.right - pad);
  const overLeft = view.left + pad - item.left;

  if (overRight > 0) row.scrollBy({ left: overRight, behavior });
  else if (overLeft > 0) row.scrollBy({ left: -overLeft, behavior });
}

/**
 * Держать выбранную вкладку целиком на виду.
 *
 * Ряд вкладок на узком экране прокручивается вбок, и крайняя вкладка там
 * обрезана краем экрана: нажать её можно, а прочитать — нет. После смены
 * выбора подтягиваем ряд к ней.
 *
 * Возвращает ref, который вешается на контейнер с role="tablist"; активную
 * вкладку ищем по aria-selected, поэтому отдельного списка не нужно.
 */
export function useKeepTabInView<T extends HTMLElement = HTMLDivElement>(
  value: string
): React.RefObject<T | null> {
  const ref = React.useRef<T>(null);

  /* Эффект, а не обработчик клика: к этому моменту aria-selected уже
     переставлен, а соседи (например кнопка «Вся история», которая живёт
     только на первой вкладке) уже перерисованы — ширина ряда настоящая. */
  React.useEffect(() => {
    const row = ref.current;
    if (!row) return;
    keepInViewX(
      row.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]'),
      row
    );
  }, [value]);

  return ref;
}
