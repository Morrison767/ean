"use client";

/**
 * Список находок риск-правил.
 *
 * Заголовок называет нарушение, ниже — факты, из которых оно сложилось, и
 * ссылка на реестр, где их можно сверить. Без фактов и ссылки это было бы
 * обвинением без доказательства.
 */

import Link from "next/link";
import { ArrowUpRight, ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";
import type { RiskFinding } from "@/lib/findings";

export function Findings({
  findings,
  title,
  subtitle,
  /** Что показать, когда не сработало ни одно правило. */
  emptyText,
}: {
  findings: RiskFinding[];
  title: string;
  subtitle?: string;
  emptyText: string;
}) {
  if (findings.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-12 border border-border bg-surface px-3.5 py-3 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-icon-success" />
        {emptyText}
      </p>
    );
  }

  return (
    <SectionCard icon={ShieldAlert} title={title} subtitle={subtitle} collapsible={false}>
      <ul className="flex flex-col">
        {findings.map((f) => (
          <Finding key={f.id} finding={f} />
        ))}
      </ul>
    </SectionCard>
  );
}

function Finding({ finding }: { finding: RiskFinding }) {
  const high = finding.severity === "high";
  return (
    <li className="flex gap-3 border-b border-border px-4 py-3.5 last:border-0 sm:px-5">
      <ShieldAlert
        className={cn("mt-0.5 h-4 w-4 shrink-0", high ? "text-icon-danger" : "text-icon-warning")}
        strokeWidth={1.8}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{finding.title}</span>
          <Badge tone={high ? "danger" : "warning"} size="sm">
            {high ? "Высокий риск" : "Средний риск"}
          </Badge>
        </span>
        <ul className="flex flex-col gap-1">
          {finding.evidence.map((e) => (
            <li key={e} className="text-xs leading-relaxed text-muted-foreground">
              {e}
            </li>
          ))}
        </ul>
        {finding.link && (
          <Link
            href={finding.link.href}
            className="mt-0.5 inline-flex w-fit items-center gap-1 text-xs font-medium text-link transition-colors hover:text-link-hover"
          >
            {finding.link.label}
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        )}
      </div>
    </li>
  );
}
