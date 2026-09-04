"use client";

import { useEffect, useState } from "react";

/**
 * Подходит ли экран под медиазапрос.
 *
 * Первый рендер всегда отвечает «нет»: на сервере окна нет, и любой другой
 * ответ дал бы расхождение с разметкой клиента. Настоящее значение приходит
 * сразу после монтирования, поэтому запросом нельзя решать, что показать
 * вообще, — только как. Раскладку по-прежнему держат классы Tailwind.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
