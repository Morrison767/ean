"use client";

/**
 * Динамика во времени — линия с мягкой заливкой.
 *
 * Один ряд, поэтому легенды нет: её роль выполняет заголовок карточки. Линия
 * 2px, заливка — тот же брендовый тон в 12 %: она показывает объём под
 * кривой, но не спорит с самой кривой.
 *
 * Наведение обязательно: график в вебе интерактивен по умолчанию, и без
 * подсказки читатель не узнает точных значений. Считаем ближайшую точку по X
 * и подсвечиваем её маркером ≥8px с кольцом цвета подложки.
 */

import { useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface TrendPoint {
  label: string;
  value: number;
  /** Готовая подпись значения для подсказки. */
  display: string;
}

const W = 600;
const H = 160;
const PAD = { top: 12, right: 12, bottom: 22, left: 12 };

export function Trend({
  points,
  className,
}: {
  points: TrendPoint[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const gradId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values);
    const span = max - min || 1;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const xy = points.map((p, i) => ({
      x: PAD.left + (i / (points.length - 1)) * innerW,
      y: PAD.top + innerH - ((p.value - min) / span) * innerH,
    }));

    const line = xy.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
    const area = `${line} L${xy[xy.length - 1].x} ${PAD.top + innerH} L${xy[0].x} ${PAD.top + innerH} Z`;
    return { xy, line, area, baseline: PAD.top + innerH };
  }, [points]);

  if (!geom) {
    return (
      <p className={cn("px-4 py-6 text-sm text-muted-foreground sm:px-5", className)}>
        Недостаточно точек для графика
      </p>
    );
  }

  /** Ближайшая точка к курсору: попадать надо в область, а не в саму линию. */
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    let dist = Infinity;
    geom.xy.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const active = hover != null ? geom.xy[hover] : null;

  return (
    <div className={cn("relative p-4 sm:p-5", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Динамика: ${points.map((p) => `${p.label} — ${p.display}`).join("; ")}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand-500))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--brand-500))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Базовая линия — рецессивная, только чтобы заливка на что-то опиралась. */}
        <line
          x1={PAD.left}
          y1={geom.baseline}
          x2={W - PAD.right}
          y2={geom.baseline}
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        <motion.path
          d={geom.area}
          fill={`url(#${gradId})`}
          initial={{ opacity: reduce ? 1 : 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : motionTokens.duration.slow }}
        />

        <motion.path
          d={geom.line}
          fill="none"
          stroke="hsl(var(--brand-500))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: reduce ? 0 : motionTokens.duration.crawl,
            ease: motionTokens.easing.smooth,
          }}
        />

        {active && (
          <>
            <line
              x1={active.x}
              y1={PAD.top}
              x2={active.x}
              y2={geom.baseline}
              stroke="hsl(var(--border-strong))"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Маркер с кольцом цвета подложки — виден и поверх заливки. */}
            <circle
              cx={active.x}
              cy={active.y}
              r="5"
              fill="hsl(var(--brand-500))"
              stroke="hsl(var(--card))"
              strokeWidth="2"
            />
          </>
        )}

        {/* Подписи только по краям: числа на каждой точке — шум. */}
        <text x={PAD.left} y={H - 6} className="fill-current text-[11px] text-muted-foreground">
          {points[0].label}
        </text>
        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="end"
          className="fill-current text-[11px] text-muted-foreground"
        >
          {points[points.length - 1].label}
        </text>
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-10 border border-border bg-card px-2.5 py-1.5 shadow-pop"
          style={{
            left: `calc(${(geom.xy[hover].x / W) * 100}% )`,
            top: `calc(${(geom.xy[hover].y / H) * 100}% + 0.5rem)`,
          }}
        >
          <div className="text-xs text-muted-foreground">{points[hover].label}</div>
          <div className="text-sm font-semibold tabular-nums text-foreground">
            {points[hover].display}
          </div>
        </div>
      )}
    </div>
  );
}
