"use client";

/**
 * Шкала благонадёжности.
 *
 * Полоса растёт от нуля до значения за 1,2 с (duration.crawl) — это тот
 * случай, когда долгая анимация оправдана: рост показывает величину, а не
 * просто сообщает о появлении. Цвет берётся от уровня риска, чтобы полоса и
 * бейдж рядом не противоречили друг другу.
 */

import { motion, useReducedMotion } from "motion/react";

import { Counter } from "@/components/ui/counter";
import { RiskBadge } from "@/components/ui/badge";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/data/types";

const TRACK: Record<RiskLevel, string> = {
  none: "bg-success",
  medium: "bg-warning",
  high: "bg-danger",
};

export function ScoreMeter({
  score,
  level,
  className,
}: {
  score: number;
  level: RiskLevel;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-12 border border-border bg-surface p-3",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <RiskBadge level={level} size="sm" />
        <span className="flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums text-foreground">
            <Counter value={String(score)} />
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Балл благонадёжности"
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <motion.div
          initial={{ width: reduce ? `${score}%` : 0 }}
          animate={{ width: `${score}%` }}
          transition={{
            duration: reduce ? 0 : motionTokens.duration.crawl,
            ease: motionTokens.easing.smooth,
          }}
          className={cn("h-full rounded-full", TRACK[level])}
        />
      </div>
    </div>
  );
}
