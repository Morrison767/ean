"use client";

/**
 * Модуль ЭСФ: посадочный поиск и выдача контрагентов.
 *
 * Сценарий взят из прежней версии без изменений: вход в модуль — это поиск, а
 * не реестр. Аналитик приходит сюда с конкретным контрагентом, и список всех
 * счетов-фактур страны ему на входе не нужен; общий реестр доступен ссылкой
 * «Открыть весь реестр контрагентов».
 *
 * Выдача — карточки контрагентов, а не счетов-фактур: единица работы здесь
 * организация, внутрь которой потом проваливаются.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Building2, ChevronRight, Search, Star } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Stagger } from "@/components/ui/stagger";
import { SegmentedControl } from "@/components/ui/tabs";
import { money } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";
import type { Invoice, RiskLevel } from "@/data/types";

/** Частые запросы — те же, что были в прежней версии. */
const SUGGESTIONS = [
  "АО «МегаТрейд»",
  "ТОО «EIDE Software Solutions»",
  "ИП Топливо-Сервис",
  "Серверное оборудование",
  "ГСМ (дизельное топливо)",
  "Лицензии на ПО",
];

type Kind = "all" | "legal" | "ip";

export interface Counterparty {
  bin: string;
  name: string;
  /** ИП определяем по названию: отдельного признака в данных нет. */
  kind: Exclude<Kind, "all">;
  asSupplier: number;
  asCustomer: number;
  total: number;
  operations: number;
  risk: RiskLevel;
  products: string[];
}

const RISK_ORDER: RiskLevel[] = ["none", "low", "medium", "high", "critical"];

/** Свод контрагентов по всем счетам-фактурам. */
export function buildCounterparties(invoices: Invoice[]): Counterparty[] {
  const map = new Map<string, Counterparty>();

  const touch = (bin: string, name: string): Counterparty => {
    let cp = map.get(bin);
    if (!cp) {
      cp = {
        bin,
        name,
        kind: /^\s*ИП\b/i.test(name) ? "ip" : "legal",
        asSupplier: 0,
        asCustomer: 0,
        total: 0,
        operations: 0,
        risk: "none",
        products: [],
      };
      map.set(bin, cp);
    }
    return cp;
  };

  const worse = (a: RiskLevel, b: RiskLevel) =>
    RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;

  for (const inv of invoices) {
    const s = touch(inv.supplierBin, inv.supplier);
    s.asSupplier += inv.amount;
    s.total += inv.amount;
    s.operations += 1;
    s.risk = worse(s.risk, inv.risk);
    if (!s.products.includes(inv.product)) s.products.push(inv.product);

    const c = touch(inv.customerBin, inv.customer);
    c.asCustomer += inv.amount;
    c.total += inv.amount;
    c.operations += 1;
    c.risk = worse(c.risk, inv.risk);
    if (!c.products.includes(inv.product)) c.products.push(inv.product);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

const norm = (s: string) => s.toLowerCase().replace(/[«»"]/g, "").trim();

export function EsfModule() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();

  const query = params.get("q") ?? "";
  const showAll = params.get("all") === "1";
  const invoices = useApp((s) => s.db.invoices);
  const log = useApp((s) => s.log);

  const [term, setTerm] = useState(query);
  const [kind, setKind] = useState<Kind>("all");

  useEffect(() => setTerm(query), [query]);

  useEffect(() => {
    if (!query) return;
    log({ action: "search", subject: query, subjectType: "esf", ip: "10.0.1.12", status: "success" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const all = useMemo(() => buildCounterparties(invoices), [invoices]);

  const found = useMemo(() => {
    if (showAll) return all;
    if (!query) return [];
    const q = norm(query);
    return all.filter(
      (c) =>
        norm(c.name).includes(q) ||
        c.bin.includes(q) ||
        c.products.some((p) => norm(p).includes(q))
    );
  }, [all, query, showAll]);

  const counts = {
    all: found.length,
    legal: found.filter((c) => c.kind === "legal").length,
    ip: found.filter((c) => c.kind === "ip").length,
  };
  const shown = kind === "all" ? found : found.filter((c) => c.kind === kind);

  const go = (q: string) => {
    const v = q.trim();
    if (v) router.push(`/esf?q=${encodeURIComponent(v)}`);
  };

  /* -------------------- посадочный поиск -------------------- */
  if (!query && !showAll) {
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Поиск по ЭСФ</h1>
            <p className="max-w-lg text-sm text-muted-foreground">
              Глубокий поиск по электронным счетам-фактурам: по БИН/ИИН, контрагенту,
              товару или номеру ЭСФ.
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
              placeholder="БИН/ИИН, контрагент, товар, № ЭСФ…"
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

          <Button
            variant="ghost"
            iconRight={ChevronRight}
            onClick={() => router.push("/esf?all=1")}
          >
            Открыть весь реестр контрагентов
          </Button>
        </motion.div>
      </Screen>
    );
  }

  /* -------------------- выдача -------------------- */
  return (
    <Screen
      title={
        showAll ? (
          "Реестр контрагентов"
        ) : (
          <>
            Найдено: <span className="text-primary">{found.length}</span>
          </>
        )
      }
      subtitle={showAll ? "Все контрагенты в обороте ЭСФ" : `по запросу «${query}»`}
      actions={
        <Button variant="secondary" icon={Search} onClick={() => router.push("/esf")}>
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
          placeholder="БИН/ИИН, контрагент, товар, № ЭСФ…"
          className="h-11"
        />
        <Button type="submit">Поиск ЭСФ</Button>
      </form>

      <SegmentedControl
        value={kind}
        onChange={(v) => setKind(v as Kind)}
        items={[
          { id: "all", label: "Все", count: counts.all },
          { id: "legal", label: "Юр. лица", count: counts.legal },
          { id: "ip", label: "ИП", count: counts.ip },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Контрагенты не найдены"
          description="Попробуйте изменить запрос или открыть весь реестр контрагентов."
        />
      ) : (
        <Stagger>
          {shown.map((c) => (
            <CounterpartyCard key={c.bin} cp={c} />
          ))}
        </Stagger>
      )}
    </Screen>
  );
}

function CounterpartyCard({ cp }: { cp: Counterparty }) {
  const router = useRouter();
  const role =
    cp.asSupplier > 0 && cp.asCustomer > 0
      ? "Поставщик · Покупатель"
      : cp.asSupplier > 0
        ? "Поставщик"
        : "Покупатель";

  return (
    <button
      type="button"
      onClick={() => router.push(`/esf/${cp.bin}`)}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-card-hover"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-primary">
        <Building2 className="h-5 w-5" strokeWidth={1.8} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-semibold text-foreground">
            {companyCase(cp.name)}
          </span>
          <Badge tone="outline" size="sm">
            {cp.kind === "ip" ? "ИП" : "Юр. лицо"}
          </Badge>
          <RiskBadge level={cp.risk} size="sm" />
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">БИН: {cp.bin}</span>
        <span className="truncate text-xs text-muted-foreground">
          {role} · {cp.products.slice(0, 2).join(", ")}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-base font-semibold tabular-nums text-foreground">
          {money(cp.total)}
        </span>
        <span className="text-xs text-muted-foreground">{cp.operations} операций</span>
      </span>

      <ChevronRight className="h-5 w-5 shrink-0 text-icon-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}
