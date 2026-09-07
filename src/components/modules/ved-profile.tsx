"use client";

/**
 * Профиль участника ВЭД.
 *
 * Устройство перенесено из прежней версии: крошка «К участникам ВЭД», шапка с
 * действиями, пять вкладок и фильтр периода с детализацией (за всё время /
 * поквартально / по месяцам).
 *
 * Таможенные сборы считаются здесь же, как и раньше: пошлина 7 % и НДС 12 %
 * от таможенной стоимости. Отдельного поля в данных нет — это расчёт.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Building2,
  Download,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Sparkles,
  Users,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { BarList } from "@/components/charts/bar-list";
import { SchemeChain } from "@/components/charts/scheme-chain";
import { Trend } from "@/components/charts/trend";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { SegmentedControl, UnderlineTabs } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from "@/components/ui/table";
import { COUNTRY_NAME } from "@/config/countries";
import { groupSum } from "@/lib/aggregate";
import { money, num, percent, usd } from "@/lib/format";
import { cn, companyCase } from "@/lib/utils";
import type { Participant } from "@/components/modules/ved-module";
import type { Company, Declaration, SchemeGraph } from "@/data/types";

const TABS = [
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "products", label: "Товары (ТН ВЭД)", icon: Package },
  { id: "participants", label: "Контрагенты ВЭД", icon: Users },
  { id: "operations", label: "Реестр деклараций (ГТД)", icon: Globe },
  { id: "geography", label: "География и Цепочки", icon: MapIcon },
];

/** Ставки таможенных платежей — те же, что были подписаны в прежней версии. */
const DUTY_RATE = 0.07;
const VAT_RATE = 0.12;

const yearOf = (d: string) => d.slice(-4);
const monthOf = (d: string) => d.slice(3, 5);

export function VedProfile({
  participant,
  declarations,
  company,
  schemes,
}: {
  participant: Participant;
  declarations: Declaration[];
  company?: Company;
  schemes: SchemeGraph[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState("dashboard");
  const [period, setPeriod] = useState<string>("all");
  const [grain, setGrain] = useState<"quarter" | "month">("quarter");

  const years = useMemo(
    () => [...new Set(declarations.map((d) => yearOf(d.date)))].sort(),
    [declarations]
  );

  const scoped = useMemo(
    () => (period === "all" ? declarations : declarations.filter((d) => yearOf(d.date) === period)),
    [declarations, period]
  );

  return (
    <Screen className="max-w-[1500px]">
      <button
        type="button"
        onClick={() => router.push("/ved?all=1")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />К участникам ВЭД
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-12 bg-accent text-primary">
            <Building2 className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              {companyCase(participant.name)}
            </h1>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">БИН {participant.bin}</span>
              <RiskBadge level={participant.risk} size="sm" />
              <span>{num(participant.declarations)} деклараций</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {company && (
            <Button
              variant="secondary"
              icon={ExternalLink}
              onClick={() => router.push(`/company/${company.id}`)}
            >
              Перейти в досье
            </Button>
          )}
          <Button icon={Sparkles}>Портрет AI</Button>
          <Button variant="secondary" icon={Download}>
            Скачать отчёт по ВЭД
          </Button>
        </div>
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      <div className="flex flex-wrap items-center gap-2 rounded-12 border border-border bg-card px-3 py-2">
        <span className="text-overline uppercase text-muted-foreground">Период</span>
        {[{ id: "all", label: "За всё время" }, ...years.map((y) => ({ id: y, label: y }))].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            aria-pressed={period === p.id}
            className={cn(
              "rounded-10 px-3 py-1 text-sm transition-colors",
              period === p.id
                ? "bg-accent font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
        {period !== "all" && (
          <span className="ml-auto">
            <SegmentedControl
              value={grain}
              onChange={(v) => setGrain(v as "quarter" | "month")}
              items={[
                { id: "quarter", label: "Поквартально" },
                { id: "month", label: "По месяцам" },
              ]}
            />
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.12 : 0.2 }}
          className="flex flex-col gap-4"
        >
          {tab === "dashboard" && <Dashboard scoped={scoped} period={period} grain={grain} />}
          {tab === "products" && <ProductsTab scoped={scoped} />}
          {tab === "participants" && <PartnersTab scoped={scoped} />}
          {tab === "operations" && <OperationsTab scoped={scoped} />}
          {tab === "geography" && <GeographyTab scoped={scoped} participant={participant} schemes={schemes} />}
        </motion.div>
      </AnimatePresence>
    </Screen>
  );
}

/* --------------------------------- Дашборд --------------------------------- */

function Dashboard({
  scoped,
  period,
  grain,
}: {
  scoped: Declaration[];
  period: string;
  grain: "quarter" | "month";
}) {
  const imports = scoped.filter((d) => d.type === "import");
  const exports = scoped.filter((d) => d.type === "export");
  const sumUsd = (xs: Declaration[]) => xs.reduce((s, d) => s + d.valueUsd, 0);
  const customsBase = scoped.reduce((s, d) => s + d.customsKzt, 0);

  const duty = customsBase * DUTY_RATE;
  const vat = customsBase * VAT_RATE;

  /* Ряд динамики: по годам, а внутри года — по кварталам или месяцам. */
  const trend = useMemo(() => {
    if (period === "all") {
      const g = new Map<string, number>();
      for (const d of scoped) g.set(yearOf(d.date), (g.get(yearOf(d.date)) ?? 0) + d.valueUsd);
      return [...g.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, v]) => ({ label, value: v, display: usd(v) }));
    }
    if (grain === "month") {
      const g = new Map<string, number>();
      for (const d of scoped) g.set(monthOf(d.date), (g.get(monthOf(d.date)) ?? 0) + d.valueUsd);
      return [...g.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, v]) => ({ label, value: v, display: usd(v) }));
    }
    const q = [0, 0, 0, 0];
    for (const d of scoped) q[Math.floor((Number(monthOf(d.date)) - 1) / 3)] += d.valueUsd;
    return q.map((v, i) => ({ label: `${i + 1} кв`, value: v, display: usd(v) }));
  }, [scoped, period, grain]);

  return (
    <Stagger>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Деклараций" value={num(scoped.length)} />
        <Kpi label="Импорт" value={usd(sumUsd(imports))} />
        <Kpi label="Экспорт" value={usd(sumUsd(exports))} />
        <Kpi label={`Пошлина (${Math.round(DUTY_RATE * 100)}%)`} value={money(duty)} />
        <Kpi label={`НДС (${Math.round(VAT_RATE * 100)}%)`} value={money(vat)} />
      </div>

      <SectionCard icon={Globe} title="Таможенные сборы" collapsible={false}>
        <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
          <Field label="Таможенная стоимость" value={money(customsBase)} />
          <Field label={`Пошлина (${Math.round(DUTY_RATE * 100)}%)`} value={money(duty)} />
          <Field label={`НДС (${Math.round(VAT_RATE * 100)}%)`} value={money(vat)} />
        </div>
      </SectionCard>

      <SectionCard icon={LayoutDashboard} title="Динамика оборота" collapsible={false}>
        {trend.length < 2 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">Нет операций за период</p>
        ) : (
          <Trend points={trend} />
        )}
      </SectionCard>
    </Stagger>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-12 border border-border bg-card p-3">
      <div className="text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/* --------------------------------- Товары --------------------------------- */

function ProductsTab({ scoped }: { scoped: Declaration[] }) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; qty: number; value: number; count: number; risky: number }
    >();
    for (const d of scoped) {
      const prev = map.get(d.hsCode) ?? {
        code: d.hsCode,
        name: d.product,
        qty: 0,
        value: 0,
        count: 0,
        risky: 0,
      };
      prev.qty += d.qty;
      prev.value += d.valueUsd;
      prev.count += 1;
      if (d.risk !== "none") prev.risky += 1;
      map.set(d.hsCode, prev);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [scoped]);

  return (
    <Stagger>
      <SectionCard
        icon={Package}
        title="Товарные группы"
        subtitle={`Найдено уникальных ТН ВЭД: ${rows.length}`}
        collapsible={false}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код ТН ВЭД</TableHead>
                <TableHead>Наименование ТН ВЭД</TableHead>
                <TableHead numeric>Кол-во</TableHead>
                <TableHead numeric>Сумма</TableHead>
                <TableHead numeric>Доля</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>Нет операций за период</TableEmpty>
              ) : (
                rows.map((r) => {
                  const total = rows.reduce((s, x) => s + x.value, 0) || 1;
                  return (
                    <TableRow key={r.code}>
                      <TableCell className="tabular-nums font-medium">{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell numeric>{num(r.qty)}</TableCell>
                      <TableCell numeric>{usd(r.value)}</TableCell>
                      <TableCell numeric className="text-muted-foreground">
                        {percent((r.value / total) * 100)}
                      </TableCell>
                      <TableCell>
                        {r.risky ? (
                          <Badge tone="danger" size="sm">
                            {r.risky}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Stagger>
  );
}

/* ------------------------------- Контрагенты ------------------------------- */

function PartnersTab({ scoped }: { scoped: Declaration[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { partner: string; countries: Set<string>; value: number; n: number }>();
    for (const d of scoped) {
      const prev = map.get(d.partner) ?? {
        partner: d.partner,
        countries: new Set<string>(),
        value: 0,
        n: 0,
      };
      prev.countries.add(d.countryCode);
      prev.value += d.valueUsd;
      prev.n += 1;
      map.set(d.partner, prev);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [scoped]);

  return (
    <Stagger>
      <SectionCard
        icon={Users}
        title="Иностранные партнёры компании"
        subtitle={`найдено ${rows.length}`}
        collapsible={false}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Контрагент</TableHead>
                <TableHead>Страна</TableHead>
                <TableHead numeric>Деклараций</TableHead>
                <TableHead numeric>Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={4}>Нет операций за период</TableEmpty>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.partner}>
                    <TableCell className="font-medium">{r.partner}</TableCell>
                    <TableCell>{[...r.countries].map((c) => COUNTRY_NAME[c] ?? c).join(", ")}</TableCell>
                    <TableCell numeric>{r.n}</TableCell>
                    <TableCell numeric>{usd(r.value)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Stagger>
  );
}

/* --------------------------------- Реестр --------------------------------- */

function OperationsTab({ scoped }: { scoped: Declaration[] }) {
  return (
    <Stagger>
      <SectionCard
        icon={Globe}
        title="Реестр деклараций (ГТД)"
        subtitle={`${scoped.length} записей`}
        collapsible={false}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер ДТ</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Направление</TableHead>
                <TableHead>Партнёр</TableHead>
                <TableHead>Страна</TableHead>
                <TableHead>Товар</TableHead>
                <TableHead numeric>Стоимость</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoped.length === 0 ? (
                <TableEmpty colSpan={8}>Нет операций за период</TableEmpty>
              ) : (
                scoped.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap font-medium">{d.id}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{d.date}</TableCell>
                    <TableCell>
                      <Badge tone={d.type === "import" ? "indigo" : "teal"} size="sm">
                        {d.type === "import" ? "Импорт" : "Экспорт"}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.partner}</TableCell>
                    <TableCell>{COUNTRY_NAME[d.countryCode] ?? d.countryCode}</TableCell>
                    <TableCell>{d.product}</TableCell>
                    <TableCell numeric>{usd(d.valueUsd)}</TableCell>
                    <TableCell>
                      <RiskBadge level={d.risk} size="sm" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Stagger>
  );
}

/* ---------------------------- География и цепочки ---------------------------- */

function GeographyTab({
  scoped,
  participant,
  schemes,
}: {
  scoped: Declaration[];
  participant: Participant;
  schemes: SchemeGraph[];
}) {
  const mk = (kind: "import" | "export") =>
    groupSum(scoped.filter((d) => d.type === kind), (d) => d.countryCode, (d) => d.valueUsd).map(
      (g) => ({
        label: COUNTRY_NAME[g.key] ?? g.key,
        value: g.value,
        display: usd(g.value),
        hint: `${g.count} ДТ`,
      })
    );

  const chains = schemes.filter(
    (s) =>
      s.nodes?.some((n) => n.bin === participant.bin) ||
      s.edges?.some((e) => e.flag === "markup" || e.flag === "break")
  );

  return (
    <Stagger>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={ArrowDownToLine} title="Импорт по странам" collapsible={false}>
          <BarList items={mk("import")} />
        </SectionCard>
        <SectionCard icon={ArrowUpFromLine} title="Экспорт по странам" collapsible={false}>
          <BarList items={mk("export")} />
        </SectionCard>
      </div>

      {chains.map((s, i) => (
        <SectionCard
          key={`${s.title}-${i}`}
          icon={MapIcon}
          title={s.title}
          subtitle="Цепочка поставки"
          collapsible={false}
        >
          <SchemeChain scheme={s} />
        </SectionCard>
      ))}
    </Stagger>
  );
}
