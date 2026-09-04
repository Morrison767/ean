"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Светлая и тёмная темы.
 *
 * Все цвета в приложении идут из токенов, поэтому переключение — это подмена
 * значений: класс `dark` на <html> перекрывает переменные в globals.css.
 * Отдельных `dark:`-классов в разметке нет и быть не должно.
 *
 * Три состояния, как в системных настройках: «как в системе», «светлая»,
 * «тёмная». По умолчанию — системная: человек, у которого весь ноутбук
 * тёмный, не должен получать белую вспышку на весь экран.
 */
export type Theme = "system" | "light" | "dark";

const KEY = "ea-theme";

/**
 * Скрипт, который ставит класс до первой отрисовки.
 *
 * Без него страница успевает мигнуть светлой темой: React расставляет классы
 * уже после гидратации. Держим его строкой — он уходит в разметку как есть.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

const systemDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const apply = (theme: Theme) => {
  const dark = theme === "dark" || (theme === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
};

export function useTheme() {
  /*
    Начальное значение одинаково на сервере и на клиенте — иначе разметка
    разойдётся при гидратации. Настоящее читаем в эффекте.
  */
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Theme | null) ?? "system";
    setTheme(saved);
    setReady(true);
  }, []);

  /* Системная тема может смениться на ходу — следим, пока выбрано «как в системе». */
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const set = useCallback((next: Theme) => {
    setTheme(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* Приватный режим — тема просто не запомнится. */
    }
    apply(next);
  }, []);

  /** Что показано сейчас: с учётом системной настройки. */
  const dark = ready
    ? theme === "dark" || (theme === "system" && systemDark())
    : false;

  /** Переключатель кнопкой: светлая ⇄ тёмная, выбор запоминается. */
  const toggle = useCallback(() => set(dark ? "light" : "dark"), [dark, set]);

  return { theme, dark, ready, set, toggle };
}
