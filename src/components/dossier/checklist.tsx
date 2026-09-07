"use client";

/**
 * Чек-лист благонадёжности.
 *
 * Разделы приходят из справочника, срабатывания — из самого субъекта:
 * `trustFlags` это подтверждённые попадания, `trustChecks` — то, что требует
 * проверки. Всё остальное чисто.
 *
 * Чистые пункты намеренно тихие: на экране их несколько десятков, и если
 * красить их наравне с попаданиями, четыре реальные проблемы утонут в тридцати
 * зелёных галочках.
 */

import { AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { cn } from "@/lib/utils";
import type { ChecklistSection } from "@/data/types";

type Verdict = "clean" | "attention" | "hit";

const VERDICT: Record<Verdict, { label: string; className: string }> = {
  clean: { label: "Чисто", className: "text-muted-foreground" },
  attention: { label: "Проверить", className: "text-warning-foreground font-semibold" },
  hit: { label: "Обнаружено", className: "text-danger font-semibold" },
};

export function Checklist({
  sections,
  flags,
  checks,
  hasSource,
  onOpenSource,
}: {
  sections: ChecklistSection[];
  /** Подтверждённые срабатывания. */
  flags: string[];
  /** Пункты, требующие проверки. */
  checks: string[];
  /** Есть ли у пункта запись источника. Без неё строка не кликабельна. */
  hasSource?: (item: string) => boolean;
  /** Открыть запись источника. */
  onOpenSource?: (item: string) => void;
}) {
  const verdictOf = (item: string): Verdict =>
    flags.includes(item) ? "hit" : checks.includes(item) ? "attention" : "clean";

  const total = flags.length + checks.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldAlert
          className={cn("h-5 w-5", total ? "text-icon-danger" : "text-icon-success")}
        />
        <span className="text-base font-semibold text-foreground">Благонадёжность</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            total ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success-foreground"
          )}
        >
          {total}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map((section) => (
          <Stagger key={section.category}>
            <SectionCard
              icon={total ? AlertTriangle : CheckCircle2}
              title={section.category}
              collapsible={false}
            >
              <ul className="flex flex-col">
                {section.items.map((item) => {
                  const v = verdictOf(item);
                  /*
                    Кликабельна только та строка, за которой действительно
                    есть запись источника. Иначе курсор и шеврон обещают
                    переход, которого нет, — а это хуже, чем неподвижная
                    строка.
                  */
                  const clickable =
                    v !== "clean" && !!onOpenSource && (hasSource?.(item) ?? false);
                  const Row = clickable ? "button" : "div";
                  return (
                    <li key={item} className="border-b border-border last:border-0">
                      <Row
                        {...(clickable
                          ? {
                              type: "button" as const,
                              onClick: () => onOpenSource?.(item),
                              title: "Открыть источник данных",
                            }
                          : {})}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-4 py-2 text-left sm:px-5",
                          clickable && "cursor-pointer transition-colors hover:bg-surface"
                        )}
                      >
                      <span className="flex min-w-0 items-center gap-2">
                        {v === "clean" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-icon-success" />
                        ) : v === "attention" ? (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-icon-warning" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 shrink-0 text-icon-danger" />
                        )}
                        <span className="truncate text-sm text-foreground" title={item}>
                          {item}
                        </span>
                      </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className={cn("text-xs", VERDICT[v].className)}>
                            {VERDICT[v].label}
                          </span>
                          {clickable && (
                            <ChevronRight
                              className={cn(
                                "h-3.5 w-3.5",
                                v === "hit" ? "text-danger" : "text-warning-foreground"
                              )}
                            />
                          )}
                        </span>
                      </Row>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          </Stagger>
        ))}
      </div>
    </div>
  );
}
