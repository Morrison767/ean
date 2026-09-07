"use client";

/**
 * Профиль контрагента в ЭСФ.
 *
 * Устройство перенесено из прежней версии: хлебная крошка «К контрагентам»,
 * шапка с действиями, пять вкладок и фильтр периода над содержимым. Фильтр
 * общий для всех вкладок — он часть профиля, а не отдельной таблицы.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Building2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  LayoutDashboard,
  Network,
  Package,
  Sparkles,
  Users,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { GroupedBars, SERIES_COLORS } from "@/components/charts/grouped-bars";
import { SchemeChain } from "@/components/charts/scheme-chain";
import { InvoiceDialog } from "@/components/modules/invoice-dialog";
import { SignalCards } from "@/components/modules/signal-cards";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { ReportProgress, useReportProgress } from "@/components/ui/report-progress";
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
import {
  ESF_SERIES_KEYS,
  ESF_SERIES_LABEL,
  ESF_YEARS,
  buildEsfSeries,
  esfBuckets,
  periodSum,
  bucketSum,
  type EsfSeriesKey,
} from "@/lib/esf-series";
import { buildEsfSignals } from "@/lib/esf-signals";
import { money, moneyFull, num, percent } from "@/lib/format";
import { cn, companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";
import type { Counterparty } from "@/components/modules/esf-module";
import type { Company, Invoice, SchemeGraph } from "@/data/types";

const TABS = [
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "counterparties", label: "Контрагенты", icon: Users },
  { id: "operations", label: "Список ЭСФ", icon: FileSpreadsheet },
  { id: "products", label: "ТРУ", icon: Package },
  { id: "chains", label: "Схема связей", icon: Network },
];

/** Ряды диаграммы — состав и порядок как в прежней версии. */
const SERIES = ESF_SERIES_KEYS.map((key, i) => ({
  key,
  label: ESF_SERIES_LABEL[key],
  color: SERIES_COLORS[i],
}));

const yearOf = (date: string) => date.slice(-4);

export function EsfProfile({
  cp,
  invoices,
  company,
  schemes,
}: {
  cp: Counterparty;
  /** Все счета-фактуры, где контрагент участвует. */
  invoices: Invoice[];
  /** Карточка юрлица, если она есть в базе: даёт налоги, ФОТ, доход и расход. */
  company?: Company;
  schemes: SchemeGraph[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState("dashboard");
  const [period, setPeriod] = useState("all");
  const report = useReportProgress();

  /* Годы фиксированы, как в прежней версии: демо-данные размечены под них. */
  const years = ESF_YEARS.map(String);

  const scoped = useMemo(
    () => (period === "all" ? invoices : invoices.filter((i) => yearOf(i.date) === period)),
    [invoices, period]
  );

  const sales = scoped.filter((i) => i.supplierBin === cp.bin);
  const purchases = scoped.filter((i) => i.customerBin === cp.bin);
  const deviations = scoped.filter((i) => i.avgPrice && i.price > i.avgPrice).length;

  return (
    <Screen className="max-w-[1500px]">
      <ReportProgress phase={report.phase} label="Формируется список ЭСФ…" />

      <button
        type="button"
        onClick={() => router.push("/esf?all=1")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />К контрагентам
      </button>

      {/* Шапка профиля */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-12 bg-accent text-primary">
            <Building2 className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              {companyCase(cp.name)}
            </h1>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">БИН {cp.bin}</span>
              <RiskBadge level={cp.risk} size="sm" />
              {deviations > 0 && (
                <span className="text-danger">
                  {num(deviations)} операций с отклонением цены
                </span>
              )}
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
          <Button variant="secondary" icon={Download} onClick={report.start}>
            Скачать список ЭСФ
          </Button>
        </div>
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      {/* Фильтр периода — общий для всех вкладок профиля */}
      <div className="flex flex-wrap items-center gap-2 rounded-12 border border-border bg-card px-3 py-2">
        <span className="text-overline uppercase text-muted-foreground">Период</span>
        {[{ id: "all", label: "За всё время" }, ...years.map((y) => ({ id: y, label: y }))].map(
          (p) => (
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
          )
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
          {tab === "dashboard" && (
            <Dashboard
              cp={cp}
              sales={sales}
              purchases={purchases}
              invoices={invoices}
              scoped={scoped}
              company={company}
              schemes={schemes}
              period={period}
            />
          )}
          {tab === "counterparties" && <CounterpartiesTab cp={cp} scoped={scoped} />}
          {tab === "operations" && <OperationsTab cp={cp} scoped={scoped} />}
          {tab === "products" && <ProductsTab cp={cp} sales={sales} purchases={purchases} />}
          {tab === "chains" && <ChainsTab cp={cp} schemes={schemes} />}
        </motion.div>
      </AnimatePresence>
    </Screen>
  );
}

/* --------------------------------- Дашборд --------------------------------- */

function Dashboard({
  cp,
  sales,
  purchases,
  invoices,
  scoped,
  company,
  schemes,
  period,
}: {
  cp: Counterparty;
  sales: Invoice[];
  purchases: Invoice[];
  invoices: Invoice[];
  scoped: Invoice[];
  company?: Company;
  schemes: SchemeGraph[];
  period: string;
}) {
  const companies = useApp((s) => s.db.companies);
  const signals = useMemo(
    () => buildEsfSignals({ bin: cp.bin, invoices: scoped, company, companies, schemes }),
    [cp.bin, scoped, company, companies, schemes]
  );
  /* Детализация внутри года: кварталы или месяцы — как в прежней версии. */
  const [grain, setGrain] = useState<"quarter" | "month">("quarter");

  const series = useMemo(
    () => buildEsfSeries(cp.bin, cp.total, invoices),
    [cp.bin, cp.total, invoices]
  );

  const buckets = useMemo(
    () => esfBuckets(period === "all" ? "all" : Number(period), grain),
    [period, grain]
  );

  const rows = buckets.map((b) => ({
    label: b.label,
    values: Object.fromEntries(
      ESF_SERIES_KEYS.map((k) => [k, bucketSum(series[k], b)])
    ) as Record<string, number>,
  }));

  const total = (k: EsfSeriesKey) => periodSum(series[k], buckets);
  const esfCount = periodSum(series.counts, buckets);

  const kpis: Array<{ label: string; value: string; color: string }> = [
    { label: "Кол-во ЭСФ", value: num(esfCount), color: "text-primary" },
    ...ESF_SERIES_KEYS.map((k, i) => ({
      label: ESF_SERIES_LABEL[k],
      value: money(total(k)),
      color: "",
      hex: SERIES_COLORS[i],
    })),
  ].map((k) => k as { label: string; value: string; color: string });

  return (
    <Stagger>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {kpis.map((k, i) => (
          <div key={k.label} className="rounded-12 border border-border bg-card p-3">
            <div
              className="text-base font-bold tabular-nums"
              /* Цвет показателя совпадает с его рядом на графике — так KPI и
                 столбец читаются как одно и то же. Первый показатель
                 (количество) ряда не имеет и берёт брендовый. */
              style={i === 0 ? undefined : { color: SERIES_COLORS[i - 1] }}
            >
              {k.value}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      <SignalCards signals={signals} />

      <SectionCard
        icon={LayoutDashboard}
        title="Динамика: реальные операции (ЭСФ) и декларации (ФНО)"
        collapsible={false}
        action={
          period === "all" ? undefined : (
            <SegmentedControl
              value={grain}
              onChange={(v) => setGrain(v as "quarter" | "month")}
              items={[
                { id: "quarter", label: "Кварталы" },
                { id: "month", label: "Месяцы" },
              ]}
            />
          )
        }
      >
        <GroupedBars rows={rows} series={SERIES} format={money} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopTable title="Топ покупателей (реализация)" items={sales} field="customer" />
        <TopTable title="Топ поставщиков (приобретения)" items={purchases} field="supplier" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopTable title="Топ реализованных ТРУ" items={sales} field="product" />
        <TopTable title="Топ приобретённых ТРУ" items={purchases} field="product" />
      </div>
    </Stagger>
  );
}

/** Таблица «наименование — доля — сумма»: доля считается от итога таблицы. */
function TopTable({
  title,
  items,
  field,
  onRow,
}: {
  title: string;
  items: Invoice[];
  field: "customer" | "supplier" | "product";
  /** Переход по строке — во вкладке ТРУ ведёт в разбор позиции. */
  onRow?: (name: string) => void;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) map.set(i[field], (map.get(i[field]) ?? 0) + i.amount);
    const list = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = list.reduce((s, [, v]) => s + v, 0) || 1;
    return list.map(([name, amount]) => ({ name, amount, share: (amount / total) * 100 }));
  }, [items, field]);

  return (
    <SectionCard icon={Users} title={title} collapsible={false}>
      <TableWrap>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{field === "product" ? "Наименование" : "Контрагент"}</TableHead>
              <TableHead numeric>Доля</TableHead>
              <TableHead numeric>Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={3}>Данных за период нет</TableEmpty>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.name}
                  interactive={!!onRow}
                  onClick={onRow ? () => onRow(r.name) : undefined}
                >
                  <TableCell className="font-medium">
                    {field === "product" ? r.name : companyCase(r.name)}
                  </TableCell>
                  <TableCell numeric className="text-muted-foreground">
                    {percent(r.share)}
                  </TableCell>
                  <TableCell numeric>{moneyFull(r.amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrap>
    </SectionCard>
  );
}

/* ------------------------------- прочие вкладки ------------------------------- */

function CounterpartiesTab({ cp, scoped }: { cp: Counterparty; scoped: Invoice[] }) {
  const router = useRouter();
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; bin: string; sales: number; buys: number; n: number }>();
    for (const i of scoped) {
      const other =
        i.supplierBin === cp.bin
          ? { bin: i.customerBin, name: i.customer, sales: i.amount, buys: 0 }
          : { bin: i.supplierBin, name: i.supplier, sales: 0, buys: i.amount };
      const prev = map.get(other.bin) ?? { name: other.name, bin: other.bin, sales: 0, buys: 0, n: 0 };
      prev.sales += other.sales;
      prev.buys += other.buys;
      prev.n += 1;
      map.set(other.bin, prev);
    }
    return [...map.values()].sort((a, b) => b.sales + b.buys - (a.sales + a.buys));
  }, [scoped, cp.bin]);

  return (
    <Stagger>
      <SectionCard icon={Users} title="Контрагенты" subtitle={`${rows.length} организаций`} collapsible={false}>
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Наименование</TableHead>
                <TableHead>БИН</TableHead>
                <TableHead numeric>Реализация</TableHead>
                <TableHead numeric>Приобретения</TableHead>
                <TableHead numeric>ЭСФ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>Контрагентов за период нет</TableEmpty>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.bin}
                    interactive
                    onClick={() => router.push(`/esf/${cp.bin}?partner=${r.bin}`)}
                  >
                    <TableCell className="font-medium">{companyCase(r.name)}</TableCell>
                    <TableCell className="tabular-nums">{r.bin}</TableCell>
                    <TableCell numeric>{r.sales ? moneyFull(r.sales) : "—"}</TableCell>
                    <TableCell numeric>{r.buys ? moneyFull(r.buys) : "—"}</TableCell>
                    <TableCell numeric>{r.n}</TableCell>
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

function OperationsTab({ cp, scoped }: { cp: Counterparty; scoped: Invoice[] }) {
  const router = useRouter();
  /* Строка открывает карточку документа — как в прежней версии. */
  const [opened, setOpened] = useState<Invoice | null>(null);

  return (
    <Stagger>
      <InvoiceDialog
        invoice={opened}
        onClose={() => setOpened(null)}
        onCounterparty={(bin) => {
          setOpened(null);
          router.push(`/esf/${bin}`);
        }}
      />
      <SectionCard
        icon={FileSpreadsheet}
        title="Список ЭСФ"
        subtitle={`${scoped.length} счетов-фактур`}
        collapsible={false}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead>Товар</TableHead>
                <TableHead numeric>Цена</TableHead>
                <TableHead numeric>Откл.</TableHead>
                <TableHead numeric>Сумма</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoped.length === 0 ? (
                <TableEmpty colSpan={9}>Счетов-фактур за период нет</TableEmpty>
              ) : (
                scoped.map((i) => {
                  const supplier = i.supplierBin === cp.bin;
                  const delta =
                    i.avgPrice && i.avgPrice > 0 ? ((i.price - i.avgPrice) / i.avgPrice) * 100 : null;
                  return (
                    <TableRow key={i.id} interactive onClick={() => setOpened(i)}>
                      <TableCell className="whitespace-nowrap tabular-nums font-medium">{i.id}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{i.date}</TableCell>
                      <TableCell>
                        <Badge tone="outline" size="sm">
                          {supplier ? "Поставщик" : "Покупатель"}
                        </Badge>
                      </TableCell>
                      <TableCell>{companyCase(supplier ? i.customer : i.supplier)}</TableCell>
                      <TableCell>{i.product}</TableCell>
                      <TableCell numeric>{moneyFull(i.price)}</TableCell>
                      <TableCell numeric>
                        {delta == null ? (
                          <span className="text-faint">—</span>
                        ) : (
                          <Badge tone={delta > 15 ? "danger" : delta > 0 ? "warning" : "success"} size="sm">
                            {delta > 0 ? "+" : ""}
                            {percent(delta)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell numeric>{moneyFull(i.amount)}</TableCell>
                      <TableCell>
                        <RiskBadge level={i.risk} size="sm" />
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

function ProductsTab({
  cp,
  sales,
  purchases,
}: {
  cp: Counterparty;
  sales: Invoice[];
  purchases: Invoice[];
}) {
  const router = useRouter();
  const open = (product: string) =>
    router.push(`/esf/${cp.bin}?product=${encodeURIComponent(product)}`);

  return (
    <Stagger>
      <TopTable title="Реализованные ТРУ" items={sales} field="product" onRow={open} />
      <TopTable title="Приобретённые ТРУ" items={purchases} field="product" onRow={open} />
    </Stagger>
  );
}

function ChainsTab({ cp, schemes }: { cp: Counterparty; schemes: SchemeGraph[] }) {
  /* Схемы, где контрагент участвует: сверяем по БИН и по названию. */
  const mine = schemes.filter((s) =>
    s.nodes?.some((n) => n.bin === cp.bin || n.name.includes(cp.name.replace(/[«»"]/g, "").slice(0, 12)))
  );
  const list = mine.length ? mine : schemes.filter((s) => s.edges?.some((e) => e.assignment));

  return (
    <Stagger>
      {list.map((s, i) => (
        <SectionCard
          key={`${s.title}-${i}`}
          icon={Network}
          title={s.title}
          subtitle={`${s.nodes?.length ?? 0} участников`}
          collapsible={false}
        >
          <SchemeChain scheme={s} />
        </SectionCard>
      ))}
    </Stagger>
  );
}
