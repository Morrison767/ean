"use client";

/**
 * Вход в страновую сводку с посадочного экрана модуля.
 *
 * Раньше здесь стояла неприметная ссылка «Открыть весь реестр». Реестр никуда
 * не делся — он стал вкладкой внутри сводки, — но обещать одну таблицу там,
 * где открывается вся картина, неверно. Поэтому это карточка, а не ссылка: она
 * называет, что внутри, и сразу показывает объём цифрами из базы — так видно,
 * что за ней есть содержимое, ещё до перехода.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { motionTokens } from "@/lib/motion";

export interface CountryEntryStat {
  value: string;
  label: string;
}

export function CountryEntry({
  href,
  title,
  description,
  icon: Icon,
  stats,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Два-три числа из базы: они и объясняют, ради чего переходить. */
  stats: CountryEntryStat[];
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : motionTokens.distance.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduce ? 0 : 0.12,
        duration: reduce ? 0.12 : motionTokens.duration.slow,
        ease: motionTokens.easing.smooth,
      }}
      className="w-full max-w-[620px]"
    >
      <Link
        href={href}
        className="group flex w-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {title}
              <ArrowRight className="h-4 w-4 shrink-0 text-icon-secondary transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </span>
            <span className="text-sm leading-snug text-muted-foreground">{description}</span>
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3.5">
          {stats.map((s) => (
            <span key={s.label} className="flex flex-col">
              <span className="text-base font-bold tabular-nums text-foreground">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </span>
          ))}
        </span>
      </Link>
    </motion.div>
  );
}
