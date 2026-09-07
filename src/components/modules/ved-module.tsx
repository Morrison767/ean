"use client";

/**
 * Модуль ВЭД: посадочный поиск и выдача участников.
 *
 * Сценарий как в прежней версии — вход это поиск, а не реестр деклараций.
 * Единица работы здесь участник ВЭД (компания), внутрь которого проваливаются;
 * общий список открывается ссылкой «Открыть весь реестр участников».
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, Search, Star } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Stagger } from "@/components/ui/stagger";
import { SegmentedControl } from "@/components/ui/tabs";
import { usd } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";
import type { Company, Declaration, RiskLevel } from "@/data/types";

/** Частые запросы — те же, что в прежней версии. */
const SUGGESTIONS = [
  "EIDE Software Solutions",
  "МегаТрейд",
  "Серверное оборудование",
  "Китай",
];

type Kind = "all" | "legal" | "ip";

export interface Participant {
  bin: string;
  name: string;
  kind: Exclude<Kind, "all">;
  /** Оборот — сумма стоимости всех деклараций, в долларах. */
  turnover: number;
  imports: number;
  exports: number;
  declarations: number;
  risk: RiskLevel;
  /** Вид деятельности из карточки юрлица, если она есть. */
  activity?: string;
}

const RISK_ORDER: RiskLevel[] = ["none", "medium", "high"];

export function buildParticipants(
  declarations: Declaration[],
  companies: Company[]
): Participant[] {
  const byBin = new Map<string, Participant>();
  const worse = (a: RiskLevel, b: RiskLevel) =>
    RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;

  for (const d of declarations) {
    let p = byBin.get(d.bin);
    if (!p) {
      const company = companies.find((c) => c.bin === d.bin);
      p = {
        bin: d.bin,
        name: d.company,
        kind: /^\s*ИП\b/i.test(d.company) ? "ip" : "legal",
        turnover: 0,
        imports: 0,
        exports: 0,
        declarations: 0,
        risk: "none",
        activity: company?.activityType,
      };
      byBin.set(d.bin, p);
    }
    p.turnover += d.valueUsd;
    if (d.type === "import") p.imports += d.valueUsd;
    else p.exports += d.valueUsd;
    p.declarations += 1;
    p.risk = worse(p.risk, d.risk);
  }

  return [...byBin.values()].sort((a, b) => b.turnover - a.turnover);
}

const norm = (s: string) => s.toLowerCase().replace(/[«»"]/g, "").trim();

export function VedModule() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();

  const query = params.get("q") ?? "";
  const showAll = params.get("all") === "1";
  const focus = params.get("focus") ?? "";
  const effective = query || focus;

  const declarations = useApp((s) => s.db.declarations);
  const companies = useApp((s) => s.db.companies);
  const log = useApp((s) => s.log);

  const [term, setTerm] = useState(effective);
  const [kind, setKind] = useState<Kind>("all");

  useEffect(() => setTerm(effective), [effective]);

  useEffect(() => {
    if (!query) return;
    log({ action: "search", subject: query, subjectType: "ved", ip: "10.0.1.12", status: "success" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const all = useMemo(
    () => buildParticipants(declarations, companies),
    [declarations, companies]
  );

  const found = useMemo(() => {
    if (showAll) return all;
    if (!effective) return [];
    const q = norm(effective);
    return all.filter(
      (p) =>
        norm(p.name).includes(q) ||
        p.bin.includes(q) ||
        declarations.some(
          (d) =>
            d.bin === p.bin &&
            (norm(d.product).includes(q) || norm(d.partner).includes(q) || norm(d.countryCode).includes(q))
        )
    );
  }, [all, effective, showAll, declarations]);

  /* Счётчики вкладок — по всем участникам, как в прежней версии. */
  const counts = {
    all: all.length,
    legal: all.filter((p) => p.kind === "legal").length,
    ip: all.filter((p) => p.kind === "ip").length,
  };
  const shown = kind === "all" ? found : found.filter((p) => p.kind === kind);

  const go = (q: string) => {
    const v = q.trim();
    if (v) router.push(`/ved?q=${encodeURIComponent(v)}`);
  };

  if (!effective && !showAll) {
    return (
      <Screen className="max-w-[900px]">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : motionTokens.distance.md }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduce ? 0.12 : motionTokens.duration.slow,
            ease: motionTokens.easing.smooth,
          }}
          className="flex flex-col items-center gap-6 pt-8 text-center sm:pt-16"
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Поиск по ВЭД</h1>
            <p className="max-w-lg text-sm text-muted-foreground">
              Поиск по внешнеэкономической деятельности: БИН, компания, товар, страна
              или номер декларации.
            </p>
          </div>

          <form
            className="flex w-full max-w-2xl items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              go(term);
            }}
          >
            <Input
              icon={Search}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="БИН, компания, товар, страна, № декларации…"
              className="h-12"
              autoFocus
            />
            <Button type="submit" size="lg" className="px-7">
              Найти
            </Button>
          </form>

          <div className="flex w-full flex-col gap-3">
            <span className="flex items-center justify-center gap-2 text-overline uppercase text-muted-foreground">
              <Star className="h-3.5 w-3.5" />
              Частые запросы
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => go(s)}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button variant="ghost" iconRight={ChevronRight} onClick={() => router.push("/ved?all=1")}>
            Открыть весь реестр участников
          </Button>
        </motion.div>
      </Screen>
    );
  }

  return (
    <Screen
      title={showAll ? "Реестр участников ВЭД" : `Найдено: ${found.length}`}
      subtitle={showAll ? "Все компании с внешнеэкономическими операциями" : `по запросу «${effective}»`}
      actions={
        <Button variant="secondary" icon={Search} onClick={() => router.push("/ved")}>
          Новый поиск
        </Button>
      }
    >
      <form
        className="flex items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          go(term);
        }}
      >
        <Input
          icon={Search}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="БИН, компания, товар, страна, № декларации…"
          className="h-11"
        />
        <Button type="submit">Найти</Button>
      </form>

      <SegmentedControl
        value={kind}
        onChange={(v) => setKind(v as Kind)}
        items={[
          { id: "all", label: "Все", count: counts.all },
          { id: "legal", label: "Юрлица", count: counts.legal },
          { id: "ip", label: "ИП", count: counts.ip },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Участники не найдены"
          description="Попробуйте изменить запрос или открыть весь реестр участников."
        />
      ) : (
        <Stagger>
          {shown.map((p, i) => (
            <ParticipantCard key={p.bin} p={p} rank={i + 1} />
          ))}
        </Stagger>
      )}
    </Screen>
  );
}

function ParticipantCard({ p, rank }: { p: Participant; rank: number }) {
  const router = useRouter();
  const role =
    p.imports > 0 && p.exports > 0
      ? "Импортёр · Экспортёр"
      : p.imports > 0
        ? "Импортёр"
        : "Экспортёр";

  return (
    <button
      type="button"
      onClick={() => router.push(`/ved/${p.bin}`)}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-card-hover"
    >
      {/* Номер в рейтинге по обороту — как в прежней выдаче. */}
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-10 bg-muted text-sm font-semibold tabular-nums text-muted-foreground">
        {rank}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-semibold text-foreground">
            {companyCase(p.name)}
          </span>
          <Badge tone="outline" size="sm">
            {p.kind === "ip" ? "ИП" : "ЮЛ"}
          </Badge>
          <RiskBadge level={p.risk} size="sm" />
        </span>
        <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span className="tabular-nums">БИН: {p.bin}</span>
          {p.activity && <span className="truncate">{p.activity}</span>}
          <span>{role}</span>
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-base font-semibold tabular-nums text-foreground">
          {usd(p.turnover)}
        </span>
        <span className="text-xs text-muted-foreground">оборот</span>
      </span>

      <ChevronRight className="h-5 w-5 shrink-0 text-icon-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}
