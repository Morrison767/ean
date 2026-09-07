"use client";

/**
 * Схема связей субъекта.
 *
 * Три уровня удалённости раскладываются кольцами вокруг центра: прямая семья
 * и близкие — ближе, расширенный круг — дальше. Раскладка считается, а не
 * хранится: в данных у связи есть только уровень, и это ровно та величина,
 * которой должно управлять расстояние.
 *
 * Узел кликабелен — из схемы уходят в карточку человека. Наведение
 * подсвечивает узел и его подпись, как в прежней версии (радиус 21 → 24,
 * заливка 14 % → 26 %).
 */

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Connection, RiskLevel } from "@/data/types";

const W = 720;
const H = 460;
const CX = W / 2;
const CY = H / 2;
/** Радиусы колец по уровням удалённости. */
const RING = { 1: 110, 2: 175, 3: 225 } as const;

const RISK_FILL: Record<RiskLevel, string> = {
  none: "hsl(var(--brand-500))",
  medium: "hsl(var(--hue-amber))",
  high: "hsl(var(--hue-red))",
};

export function RelationsGraph({
  subjectName,
  connections,
  onOpen,
}: {
  subjectName: string;
  connections: Connection[];
  /** Переход в карточку человека, если он есть в базе. */
  onOpen?: (c: Connection) => void;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  /* Раскладка: по кольцу на уровень, узлы распределены равномерно. */
  const nodes = useMemo(() => {
    const byLevel = new Map<number, Connection[]>();
    for (const c of connections) {
      const lvl = Math.min(Math.max(c.level ?? 1, 1), 3);
      byLevel.set(lvl, [...(byLevel.get(lvl) ?? []), c]);
    }
    const out: Array<Connection & { x: number; y: number; level: 1 | 2 | 3 }> = [];
    for (const [lvl, list] of byLevel) {
      const r = RING[lvl as 1 | 2 | 3];
      /* Смещаем каждое кольцо, чтобы узлы соседних уровней не вставали в ряд. */
      const shift = lvl * 0.6;
      list.forEach((c, i) => {
        const a = (i / list.length) * Math.PI * 2 + shift;
        out.push({
          ...c,
          level: lvl as 1 | 2 | 3,
          x: CX + Math.cos(a) * r,
          y: CY + Math.sin(a) * r * 0.72,
        });
      });
    }
    return out;
  }, [connections]);

  if (nodes.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">Связи не обнаружены</p>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Схема связей: ${nodes.length} связей, три уровня`}
      >
        {/* Кольца-ориентиры */}
        {[RING[1], RING[2], RING[3]].map((r) => (
          <ellipse
            key={r}
            cx={CX}
            cy={CY}
            rx={r}
            ry={r * 0.72}
            fill="none"
            stroke="hsl(var(--border))"
            strokeDasharray="3 5"
          />
        ))}

        {/* Рёбра от центра */}
        {nodes.map((n, i) => (
          <line
            key={`e-${i}`}
            x1={CX}
            y1={CY}
            x2={n.x}
            y2={n.y}
            stroke="hsl(var(--border))"
            strokeWidth={hover === i ? 1.6 : 1}
            opacity={hover === null || hover === i ? 1 : 0.35}
          />
        ))}

        {/* Узлы */}
        {nodes.map((n, i) => {
          const active = hover === i;
          const dim = hover !== null && !active;
          const fill = RISK_FILL[n.risk ?? "none"];
          return (
            <g
              key={`n-${i}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onOpen?.(n)}
              style={{ cursor: onOpen ? "pointer" : "default", opacity: dim ? 0.4 : 1 }}
            >
              <motion.circle
                cx={n.x}
                cy={n.y}
                animate={{ r: active && !reduce ? 24 : 21 }}
                transition={{ duration: reduce ? 0 : motionTokens.duration.fast }}
                fill={fill}
                fillOpacity={active ? 0.26 : 0.14}
                stroke={fill}
                strokeWidth="1.5"
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="fill-current text-[11px] font-semibold text-foreground"
              >
                {initials(n.name)}
              </text>
              <text
                x={n.x}
                y={n.y + 38}
                textAnchor="middle"
                className={cn(
                  "fill-current text-[10px]",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {short(n.name)}
              </text>
            </g>
          );
        })}

        {/* Центр — сам субъект */}
        <circle cx={CX} cy={CY} r="30" fill="hsl(var(--primary))" />
        <text
          x={CX}
          y={CY + 5}
          textAnchor="middle"
          className="fill-white text-[13px] font-bold"
        >
          {initials(subjectName)}
        </text>
      </svg>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Прямая семья, близкие связи и расширенный круг. Нажмите на узел, чтобы открыть карточку.
      </p>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** Фамилия и инициал: полное имя под узлом не помещается. */
function short(name: string): string {
  const [last, first] = name.split(/\s+/);
  return first ? `${last} ${first[0]}.` : last;
}
