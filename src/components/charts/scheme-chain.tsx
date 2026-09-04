"use client";

/**
 * Схема связей.
 *
 * В данных это не произвольный граф, а цепочка: рёбра идут подряд и соединяют
 * соседние узлы, поэтому раскладку считать не нужно — узлы выстраиваются в
 * ряд, а между ними переходы с суммой и назначением платежа.
 *
 * Флаг ребра красит переход и подписывает его: «transit» — транзит без
 * обоснования, «circular» — возврат отправителю, «markup» — наценка,
 * «break» — разрыв цепочки. Это статусы, а не категории, поэтому у них
 * зарезервированные цвета и обязательная подпись — цветом одним не сообщаем.
 */

import { ArrowDown, AlertTriangle, Building2, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Stagger } from "@/components/ui/stagger";
import { money } from "@/lib/format";
import { cn, companyCase } from "@/lib/utils";
import type { SchemeGraph } from "@/data/types";

const FLAG: Record<string, { label: string; tone: "danger" | "warning" }> = {
  transit: { label: "Транзит без обоснования", tone: "danger" },
  circular: { label: "Возврат отправителю", tone: "danger" },
  markup: { label: "Наценка посредника", tone: "warning" },
  break: { label: "Разрыв цепочки", tone: "danger" },
};

export function SchemeChain({ scheme }: { scheme: SchemeGraph }) {
  const nodes = scheme.nodes ?? [];
  const edges = scheme.edges ?? [];

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          Схема описана текстом — участники не детализированы.
        </p>
        {scheme.notes?.map((n) => (
          <Note key={n} text={n} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <ol className="flex flex-col">
        {nodes.map((n, i) => {
          const edge = edges[i];
          const flag = edge?.flag ? FLAG[edge.flag] : undefined;
          return (
            <li key={`${n.name}-${i}`} className="flex flex-col">
              {/* Узел */}
              <div className="flex items-start gap-3 rounded-12 border border-border bg-surface p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-10 bg-accent text-primary">
                  <Building2 className="h-4.5 w-4.5" strokeWidth={1.8} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {companyCase(n.name)}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {n.role}
                    {n.bin && n.bin !== "—" && (
                      <span className="tabular-nums">· БИН {n.bin}</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-faint">{i + 1}</span>
              </div>

              {/* Переход к следующему узлу */}
              {edge && i < nodes.length - 1 && (
                <div className="flex items-center gap-3 py-2 pl-4">
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                      flag ? "bg-danger-subtle text-danger" : "bg-muted text-icon"
                    )}
                  >
                    <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    {typeof edge.amount === "number" && (
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {money(edge.amount)}
                      </span>
                    )}
                    {edge.date && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {edge.date}
                      </span>
                    )}
                    {edge.assignment && (
                      <span className="text-xs text-muted-foreground">
                        · {edge.assignment}
                      </span>
                    )}
                    {flag && (
                      <Badge tone={flag.tone} size="sm">
                        <AlertTriangle className="h-3 w-3" />
                        {flag.label}
                      </Badge>
                    )}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {scheme.notes && scheme.notes.length > 0 && (
        <Stagger className="flex flex-col gap-2">
          {scheme.notes.map((n) => (
            <Note key={n} text={n} />
          ))}
        </Stagger>
      )}
    </div>
  );
}

function Note({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 rounded-10 bg-warning-subtle px-3 py-2 text-xs text-warning-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {text}
    </p>
  );
}
