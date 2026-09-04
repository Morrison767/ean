"use client";

/**
 * Панель мониторинга.
 *
 * Первый экран после входа: строка поиска, четыре показателя, свежие
 * срабатывания риск-правил и состояние источников. Карточки выходят каскадом
 * (Stagger), показатели набегают от нуля — взгляд успевает пройти сверху вниз
 * и понять структуру страницы.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronRight,
  Database,
  RefreshCw,
  Search,
  ShieldAlert,
  Zap,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { RISK_TAG_LABEL, SOURCES } from "@/config/dashboard";
import { companyCase } from "@/lib/utils";
import { allSubjects, useApp } from "@/store/use-app";

/** Дата на подписи экрана — как её показывала прежняя панель. */
const today = () =>
  new Date().toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function DashboardPage() {
  const router = useRouter();
  const db = useApp((s) => s.db);
  const setQuery = useApp((s) => s.setQuery);
  const [term, setTerm] = useState("");

  /* Свежие угрозы — субъекты с ненулевым риском, тяжёлые сверху. */
  const threats = useMemo(() => {
    const weight = { critical: 0, high: 1, medium: 2, low: 3, none: 4 } as const;
    return allSubjects(db)
      .filter((s) => s.riskLevel !== "none")
      .sort((a, b) => weight[a.riskLevel] - weight[b.riskLevel])
      .slice(0, 5);
  }, [db]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    setQuery(term);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const kpis = [
    { label: "Субъектов в базе", value: "4 812 394", icon: Database, tone: "brand" as const },
    { label: "Высокий/критич. риск", value: "12 847", icon: ShieldAlert, tone: "danger" as const },
    { label: "Запросов сегодня", value: String(db.audit.length), icon: Search, tone: "brand" as const },
    { label: "Обновлений данных", value: "38 791", icon: Activity, tone: "success" as const },
  ];

  return (
    <Screen
      title="Панель мониторинга"
      subtitle={`Сегодня, ${today()}`}
      actions={
        <Button variant="secondary" icon={RefreshCw}>
          Обновить
        </Button>
      }
    >
      <form onSubmit={submit}>
        <Input
          icon={Search}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Поиск по ИИН/БИН, ФИО, телефону, Telegram…"
          className="h-12"
          addon={
            <kbd className="hidden shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-xs text-muted-foreground sm:block">
              ⌘K
            </kbd>
          }
        />
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiTile key={k.label} {...k} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Stagger>
          <SectionCard
            icon={Zap}
            title="Новые угрозы"
            subtitle="Срабатывания риск-правил за последние сутки"
            collapsible={false}
            action={
              <Button
                variant="ghost"
                size="sm"
                iconRight={ChevronRight}
                onClick={() => router.push("/search")}
              >
                Все
              </Button>
            }
          >
            <ul className="flex flex-col">
              {threats.map((s) => {
                const name = s.kind === "person" ? s.fullName : companyCase(s.name);
                const href = s.kind === "person" ? `/person/${s.id}` : `/company/${s.id}`;
                const tag = s.riskTags?.[0];
                return (
                  <li key={`${s.kind}-${s.id}`}>
                    <button
                      type="button"
                      onClick={() => router.push(href)}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface sm:px-5"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {name}
                          </span>
                          {tag && (
                            <Badge tone="danger" size="sm">
                              {RISK_TAG_LABEL[tag] ?? tag}
                            </Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.kind === "person" ? `ИИН ${s.iin}` : `БИН ${s.bin}`}
                        </span>
                      </span>
                      <RiskBadge level={s.riskLevel} size="sm" />
                      <ChevronRight className="h-4 w-4 shrink-0 text-icon-secondary" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </Stagger>

        <Stagger>
          <SectionCard
            icon={Database}
            title="Источники данных"
            subtitle="Давность последней синхронизации"
            collapsible={false}
          >
            <ul className="flex flex-col">
              {SOURCES.map((src) => (
                <li
                  key={src.name}
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-0 sm:px-5"
                >
                  <span className="truncate text-sm text-foreground">{src.name}</span>
                  <Badge tone={src.tone} size="sm" dot>
                    {src.ago}
                  </Badge>
                </li>
              ))}
            </ul>
          </SectionCard>
        </Stagger>
      </div>
    </Screen>
  );
}
