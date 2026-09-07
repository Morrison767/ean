"use client";

/**
 * Формирование файла — перенос поведения из прежней версии.
 *
 * Пока файл готовится, экран перекрыт затемнением со спиннером: выгрузка
 * недолгая, но за это время нельзя нажать кнопку ещё раз. Готовность
 * сообщается тостом в правом нижнем углу, а не тем же окном — сообщение об
 * успехе не должно требовать закрытия.
 *
 * Файл прототип не создаёт: это демонстрация состояния, как и раньше.
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

import { motionTokens } from "@/lib/motion";

type Phase = "idle" | "working" | "done";

export function useReportProgress(doneAfter = 1400, hideAfter = 2600) {
  const [phase, setPhase] = React.useState<Phase>("idle");

  const start = React.useCallback(() => {
    setPhase((p) => (p === "working" ? p : "working"));
  }, []);

  React.useEffect(() => {
    if (phase !== "working") return;
    const t = window.setTimeout(() => setPhase("done"), doneAfter);
    return () => window.clearTimeout(t);
  }, [phase, doneAfter]);

  React.useEffect(() => {
    if (phase !== "done") return;
    const t = window.setTimeout(() => setPhase("idle"), hideAfter);
    return () => window.clearTimeout(t);
  }, [phase, hideAfter]);

  return { phase, start };
}

export function ReportProgress({ phase, label }: { phase: Phase; label: string }) {
  const reduce = useReducedMotion();

  return (
    <>
      <AnimatePresence>
        {phase === "working" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : motionTokens.duration.fast }}
            className="fixed inset-0 z-[90] grid place-items-center bg-overlay/50 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <span className="flex items-center gap-3 rounded-12 border border-border bg-card px-5 py-4 shadow-pop-strong">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : 12 }}
            transition={{
              duration: reduce ? 0 : motionTokens.duration.normal,
              ease: motionTokens.easing.smooth,
            }}
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-12 border border-success-border bg-card px-4 py-3 shadow-pop-strong"
          >
            <Check className="h-4 w-4 shrink-0 text-icon-success" />
            <span className="text-sm font-medium text-foreground">
              Файл успешно сформирован
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
