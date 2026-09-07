"use client";

/**
 * Признаки риска на дашборде ЭСФ и их разбор.
 *
 * Карточка отвечает «выявлено · сколько», а окно — на чём это основано:
 * формулировка проверки и поля записи. В прежней версии карточка без разбора
 * была бы приговором без дела, поэтому клик обязателен там, где есть что
 * показать.
 */

import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/esf-signals";

export function SignalCards({ signals }: { signals: Signal[] }) {
  const [opened, setOpened] = useState<Signal | null>(null);
  const any = signals.some((s) => s.items.length > 0);

  return (
    <>
      <SignalDialog signal={opened} onClose={() => setOpened(null)} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {signals.map((s) => {
          const hits = s.items.length;
          const clickable = hits > 0;
          const Tag = clickable ? "button" : "div";
          return (
            <Tag
              key={s.key}
              {...(clickable
                ? { type: "button" as const, onClick: () => setOpened(s) }
                : {})}
              className={cn(
                "flex items-center justify-between gap-3 rounded-12 border px-3 py-2.5 text-left",
                clickable
                  ? s.severity === "high"
                    ? "border-danger/25 bg-danger-subtle transition-colors hover:border-danger/50"
                    : "border-warning/25 bg-warning-subtle transition-colors hover:border-warning/50"
                  : "border-border bg-card"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {hits > 0 ? (
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4 shrink-0",
                      s.severity === "high" ? "text-icon-danger" : "text-icon-warning"
                    )}
                  />
                ) : (
                  <Check className="h-4 w-4 shrink-0 text-icon-success" />
                )}
                <span className="truncate text-sm text-foreground" title={s.label}>
                  {s.label}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap text-xs font-semibold",
                  hits === 0
                    ? "text-muted-foreground"
                    : s.severity === "high"
                      ? "text-danger"
                      : "text-warning-foreground"
                )}
              >
                {hits > 0 ? `Выявлено · ${hits}` : "Чисто"}
              </span>
            </Tag>
          );
        })}
      </div>

      {!any && (
        <p className="text-xs text-muted-foreground">
          Проверки пройдены: признаков риска по операциям не выявлено.
        </p>
      )}
    </>
  );
}

function SignalDialog({ signal, onClose }: { signal: Signal | null; onClose: () => void }) {
  if (!signal) return null;
  const high = signal.severity === "high";

  return (
    <Dialog open={!!signal} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle
              className={cn("h-4 w-4 shrink-0", high ? "text-icon-danger" : "text-icon-warning")}
            />
            {signal.label}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          {signal.items.map((item, i) => (
            <div
              key={i}
              className={cn(
                "rounded-12 border p-3",
                high ? "border-danger/25 bg-danger-subtle" : "border-warning/25 bg-warning-subtle"
              )}
            >
              <p className="text-sm text-foreground">{item.note}</p>
              {item.fields && item.fields.length > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-10 border border-border bg-card p-3">
                  {item.fields.map((f) => (
                    <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                      <span className="break-words text-sm text-foreground">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
