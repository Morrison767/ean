"use client";

import * as React from "react";

/**
 * Токены движения.
 *
 * Анимации в интерфейсе решают три задачи: ведут внимание, показывают
 * состояние и сохраняют пространственную связь между экранами. Всё, что
 * не делает ничего из этого, здесь не появляется.
 */

export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.28,
    slow: 0.45,
    /** Долгие вещи: рост столбиков, отрисовка линии, цикл пульсации. */
    crawl: 1.2,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  distance: {
    sm: 8,
    md: 16,
    lg: 24,
  },
};

/**
 * Пружины для прямых реакций на действие: наведение, нажатие, появление
 * галочки. На состояния, которые пользователь вызвал сам, физика отвечает
 * живее, чем фиксированная длительность.
 */
export const springs = {
  gentle: { type: "spring" as const, stiffness: 260, damping: 26, mass: 0.9 },
  snappy: { type: "spring" as const, stiffness: 420, damping: 30, mass: 0.7 },
};

/** Пружина для «переезжающей» подложки у вкладок и тоггла. */
export const pillSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};

/**
 * Флаг «первый кадр отрисован».
 *
 * Нужен там, где анимация появления живёт внутри `AnimatePresence initial={false}`:
 * такая обёртка глушит анимации монтирования у всего поддерева, и рост столбика
 * или отрисовка кольца просто не проигрываются. Со флагом это уже не появление,
 * а смена состояния — её ничто не подавляет.
 */
export function useAfterMount() {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

/**
 * Появление экрана модуля: короткий сдвиг снизу вверх.
 *
 * Только вход, без exit: уходящий экран не должен ничего доигрывать, иначе
 * незавершённая анимация блокирует монтирование следующего модуля.
 */
export const screenEnter = (reduce: boolean) => ({
  initial: { opacity: 0, y: reduce ? 0 : motionTokens.distance.sm },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: reduce ? 0.12 : motionTokens.duration.normal,
    ease: motionTokens.easing.smooth,
  },
});
