"use client";

import * as React from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";

/**
 * Число, которое набегает от нуля.
 *
 * Принимает готовую строку показателя («7,5 %», «5 640 000 ₸», «$92.4», «286»)
 * и анимирует только числовую часть, сохраняя приставку, суффикс, разделитель
 * разрядов и число знаков после запятой. Значения без цифр («ДС») выводятся
 * как есть — им анимировать нечего.
 *
 * Текст пишется прямо в узел: пересчитывать React на каждом кадре ради
 * бегущей цифры незачем.
 */

const NBSP = " ";
const NUM = new RegExp(`-?\\d[\\d\\s${NBSP}]*(?:[.,]\\d+)?`);

type Parsed = {
  prefix: string;
  suffix: string;
  value: number;
  decimals: number;
  decimalMark: "," | ".";
  groupMark: string | null;
};

function parse(text: string): Parsed | null {
  const m = NUM.exec(text);
  if (!m) return null;

  /* Хвостовые пробелы числу не принадлежат: в «5 %» пробел — часть суффикса,
     иначе в процессе счёта он терялся и получалось «3%». */
  const matched = m[0];
  const raw = matched.replace(new RegExp(`[\\s${NBSP}]+$`), "");
  const prefix = text.slice(0, m.index);
  const suffix = text.slice(m.index + raw.length);

  const decimalMatch = /[.,](\d+)$/.exec(raw);
  const decimalMark = (decimalMatch?.[0][0] as "," | ".") ?? ",";
  const decimals = decimalMatch?.[1].length ?? 0;

  /* Разделитель разрядов сохраняем ровно тот, что пришёл: в интерфейсе это
     неразрывный пробел, и подмена на обычный ломала бы перенос строки. */
  const groupMark = raw.includes(NBSP)
    ? NBSP
    : /\d\s\d/.test(raw)
      ? " "
      : null;

  const numeric = Number(
    raw.replace(new RegExp(`[\\s${NBSP}]`, "g"), "").replace(",", ".")
  );
  if (!Number.isFinite(numeric)) return null;

  return { prefix, suffix, value: numeric, decimals, decimalMark, groupMark };
}

function format(v: number, p: Parsed): string {
  const fixed = Math.abs(v).toFixed(p.decimals);
  const [int, frac] = fixed.split(".");
  const grouped = p.groupMark
    ? int.replace(/\B(?=(\d{3})+(?!\d))/g, p.groupMark)
    : int;
  const sign = v < 0 ? "-" : "";
  const body = frac ? `${grouped}${p.decimalMark}${frac}` : grouped;
  return `${p.prefix}${sign}${body}${p.suffix}`;
}

export function Counter({
  value,
  className,
}: {
  /** Готовая строка показателя. */
  value: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  /* Считаем, только когда показатель попал в кадр: цифры за пределами экрана
     досчитали бы вхолостую, и к прокрутке всё уже стояло бы на месте. */
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const from = React.useRef(0);

  const parsed = React.useMemo(() => parse(value), [value]);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !parsed) return;
    if (reduce) {
      node.textContent = value;
      return;
    }
    if (!inView) return;

    const start = from.current;
    from.current = parsed.value;
    if (start === parsed.value) {
      node.textContent = value;
      return;
    }
    const controls = animate(start, parsed.value, {
      duration: motionTokens.duration.crawl,
      ease: motionTokens.easing.smooth,
      onUpdate: (v) => {
        node.textContent = format(v, parsed);
      },
      onComplete: () => {
        // В конце показываем исходную строку — без ошибок округления.
        node.textContent = value;
      },
    });
    return () => controls.stop();
  }, [parsed, value, reduce, inView]);

  if (!parsed) return <span className={className}>{value}</span>;

  return (
    <span ref={ref} className={className}>
      {/* До счёта показываем ноль в том же формате: ширина не прыгает. */}
      {reduce ? value : format(0, parsed)}
    </span>
  );
}
