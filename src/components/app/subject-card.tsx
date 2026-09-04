"use client";

/**
 * Карточка субъекта в результатах поиска.
 *
 * Одна карточка на человека и на компанию: в общем списке они идут вперемешку,
 * и разная вёрстка заставляла бы глаз перестраиваться на каждой строке.
 * Различаются только поля в подписи и адрес перехода.
 */

import Link from "next/link";
import { Building2, ChevronRight, Mail, Phone, User } from "lucide-react";

import { Badge, RiskBadge } from "@/components/ui/badge";
import { RISK_TAG_LABEL } from "@/config/dashboard";
import { companyCase } from "@/lib/utils";
import type { Subject } from "@/data/types";

/** Инициалы для аватара: «Рамазанов Жасулан» → «РЖ». */
function initials(name: string): string {
  return name
    .replace(/[«»"]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function SubjectCard({ subject }: { subject: Subject }) {
  const person = subject.kind === "person";
  const name = person ? subject.fullName : companyCase(subject.name);
  const href = person ? `/person/${subject.id}` : `/company/${subject.id}`;

  const facts = person
    ? [
        { icon: User, text: `ИИН ${subject.iin}` },
        subject.phone ? { icon: Phone, text: subject.phone } : null,
        subject.email ? { icon: Mail, text: subject.email } : null,
      ]
    : [
        { icon: Building2, text: `БИН ${subject.bin}` },
        subject.phone ? { icon: Phone, text: subject.phone } : null,
        subject.email ? { icon: Mail, text: subject.email } : null,
      ];

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-card-hover"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-primary">
        {initials(name)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-semibold text-foreground">{name}</span>
          {subject.riskTags?.slice(0, 2).map((t) => (
            <Badge key={t} tone="danger" size="sm">
              {RISK_TAG_LABEL[t] ?? t}
            </Badge>
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {facts.filter(Boolean).map((f) => {
            const Icon = f!.icon;
            return (
              <span key={f!.text} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0 text-icon-secondary" />
                {f!.text}
              </span>
            );
          })}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {person
            ? subject.currentJob
              ? `${subject.currentJob.position} · ${companyCase(subject.currentJob.company)}`
              : "Место работы не указано"
            : subject.activityType ?? "Вид деятельности не указан"}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-2">
        <RiskBadge level={subject.riskLevel} />
        <span className="text-xs text-muted-foreground">
          Балл <span className="font-semibold tabular-nums text-foreground">{subject.score}</span>
        </span>
      </span>

      <ChevronRight className="h-5 w-5 shrink-0 text-icon-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
