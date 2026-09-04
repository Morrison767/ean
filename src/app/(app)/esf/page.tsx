"use client";

/**
 * Модуль ЭСФ.
 *
 * Структура повторяет прежнюю: дашборд, контрагенты, список счетов-фактур,
 * товары и работы (ТРУ) и схема связей. Плоский реестр без дашборда отвечал
 * только на вопрос «что было», а модуль должен отвечать и на «с кем» и
 * «на чём» — иначе аналитику приходится сводить это в голове.
 */

import { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  LayoutDashboard,
  Network,
  Package,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { BarList } from "@/components/charts/bar-list";
import { SchemeChain } from "@/components/charts/scheme-chain";
import { Trend } from "@/components/charts/trend";
import {
  RegistryTable,
  RegistryToolbar,
  useRegistryFilter,
} from "@/components/modules/registry";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { KpiTile } from "@/components/ui/kpi-tile";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { UnderlineTabs } from "@/components/ui/tabs";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { byPeriod, groupSum } from "@/lib/aggregate";
import { money, moneyFull, num, percent } from "@/lib/format";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";

const TABS = [
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "counterparties", label: "Контрагенты", icon: Users },
  { id: "operations", label: "Список ЭСФ", icon: FileSpreadsheet },
  { id: "products", label: "ТРУ", icon: Package },
  { id: "chains", label: "Схема связей", icon: Network },
];

export default function EsfPage() {
  const invoices = useApp((s) => s.db.invoices);
  const schemes = useApp((s) => s.db.schemes);
  const [tab, setTab] = useState("dashboard");

  const total = useMemo(() => invoices.reduce((s, i) => s + i.amount, 0), [invoices]);
  const overpriced = useMemo(
    () => invoices.filter((i) => i.avgPrice && i.price > i.avgPrice).length,
    [invoices]
  );
  const risky = useMemo(() => invoices.filter((i) => i.risk !== "none").length, [invoices]);

  return (
    <Screen
      title="Электронные счета-фактуры"
      subtitle="Реестр ЭСФ: контрагенты, товары, отклонение цены от рынка"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Счетов-фактур" value={num(invoices.length)} icon={FileSpreadsheet} />
        <KpiTile label="Общая сумма" value={money(total)} icon={Wallet} />
        <KpiTile label="Цена выше рынка" value={num(overpriced)} icon={TrendingUp} tone="danger" />
        <KpiTile label="С признаками риска" value={num(risky)} icon={FileSpreadsheet} tone="warning" />
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      {tab === "dashboard" && <Dashboard invoices={invoices} />}
      {tab === "counterparties" && <Counterparties invoices={invoices} />}
      {tab === "operations" && <Operations invoices={invoices} />}
      {tab === "products" && <Products invoices={invoices} />}
      {tab === "chains" && <Chains schemes={schemes} />}
    </Screen>
  );
}

type Invoices = ReturnType<typeof useApp.getState>["db"]["invoices"];

function Dashboard({ invoices }: { invoices: Invoices }) {
  const trend = useMemo(
    () =>
      byPeriod(invoices, (i) => i.date, (i) => i.amount, "year").map((g) => ({
        label: g.key,
        value: g.value,
        display: money(g.value),
      })),
    [invoices]
  );

  const buyers = useMemo(
    () =>
      groupSum(invoices, (i) => i.customer, (i) => i.amount)
        .slice(0, 8)
        .map((g) => ({
          label: companyCase(g.key),
          value: g.value,
          display: money(g.value),
          hint: `${g.count} ЭСФ`,
        })),
    [invoices]
  );

  const sellers = useMemo(
    () =>
      groupSum(invoices, (i) => i.supplier, (i) => i.amount)
        .slice(0, 8)
        .map((g) => ({
          label: companyCase(g.key),
          value: g.value,
          display: money(g.value),
          hint: `${g.count} ЭСФ`,
        })),
    [invoices]
  );

  return (
    <Stagger>
      <SectionCard icon={TrendingUp} title="Динамика выписки ЭСФ" collapsible={false}>
        <Trend points={trend} />
      </SectionCard>

      {/* Две несопоставимые величины — два графика, а не два цвета в одном. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={Users} title="Крупнейшие покупатели" collapsible={false}>
          <BarList items={buyers} />
        </SectionCard>
        <SectionCard icon={Users} title="Крупнейшие поставщики" collapsible={false}>
          <BarList items={sellers} />
        </SectionCard>
      </div>
    </Stagger>
  );
}

function Counterparties({ invoices }: { invoices: Invoices }) {
  /* Контрагент — это пара «БИН + имя»; агрегируем по БИН, показываем имя. */
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { name: string; bin: string; asSupplier: number; asCustomer: number; count: number; risky: number }
    >();
    const touch = (bin: string, name: string) => {
      if (!map.has(bin))
        map.set(bin, { name, bin, asSupplier: 0, asCustomer: 0, count: 0, risky: 0 });
      return map.get(bin)!;
    };
    for (const i of invoices) {
      const s = touch(i.supplierBin, i.supplier);
      s.asSupplier += i.amount;
      s.count += 1;
      if (i.risk !== "none") s.risky += 1;
      const c = touch(i.customerBin, i.customer);
      c.asCustomer += i.amount;
      c.count += 1;
      if (i.risk !== "none") c.risky += 1;
    }
    return [...map.values()].sort(
      (a, b) => b.asSupplier + b.asCustomer - (a.asSupplier + a.asCustomer)
    );
  }, [invoices]);

  return (
    <Stagger>
      <SectionCard
        icon={Users}
        title="Контрагенты"
        subtitle={`${rows.length} организаций в обороте`}
        collapsible={false}
      >
        <RegistryTable
          total={rows.length}
          unit={["контрагент", "контрагента", "контрагентов"]}
          empty={{ title: "Контрагенты не найдены" }}
          head={
            <>
              <TableHead>Наименование</TableHead>
              <TableHead>БИН</TableHead>
              <TableHead numeric>Как поставщик</TableHead>
              <TableHead numeric>Как покупатель</TableHead>
              <TableHead numeric>ЭСФ</TableHead>
              <TableHead numeric>С риском</TableHead>
            </>
          }
          rows={rows.map((r) => (
            <TableRow key={r.bin}>
              <TableCell className="font-medium">{companyCase(r.name)}</TableCell>
              <TableCell className="tabular-nums">{r.bin}</TableCell>
              <TableCell numeric>{r.asSupplier ? moneyFull(r.asSupplier) : "—"}</TableCell>
              <TableCell numeric>{r.asCustomer ? moneyFull(r.asCustomer) : "—"}</TableCell>
              <TableCell numeric>{r.count}</TableCell>
              <TableCell numeric>
                {r.risky ? (
                  <Badge tone="danger" size="sm">
                    {r.risky}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        />
      </SectionCard>
    </Stagger>
  );
}

function Operations({ invoices }: { invoices: Invoices }) {
  const f = useRegistryFilter(invoices, (i) => [
    i.id,
    i.supplier,
    i.customer,
    i.product,
    i.supplierBin,
    i.customerBin,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Номер ЭСФ, контрагент, БИН или товар"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["счёт-фактура", "счёта-фактуры", "счетов-фактур"]}
        empty={{
          title: "Счета-фактуры не найдены",
          description: "Измените запрос или снимите фильтр по риску.",
        }}
        head={
          <>
            <TableHead>Номер</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Поставщик</TableHead>
            <TableHead>Покупатель</TableHead>
            <TableHead>Товар</TableHead>
            <TableHead numeric>Цена</TableHead>
            <TableHead numeric>Откл. от рынка</TableHead>
            <TableHead numeric>Сумма</TableHead>
            <TableHead>Риск</TableHead>
          </>
        }
        rows={f.filtered.map((v) => {
          const delta =
            v.avgPrice && v.avgPrice > 0 ? ((v.price - v.avgPrice) / v.avgPrice) * 100 : null;
          return (
            <TableRow key={v.id}>
              <TableCell className="whitespace-nowrap tabular-nums font-medium">{v.id}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{v.date}</TableCell>
              <TableCell>{companyCase(v.supplier)}</TableCell>
              <TableCell>{companyCase(v.customer)}</TableCell>
              <TableCell>{v.product}</TableCell>
              <TableCell numeric>{moneyFull(v.price)}</TableCell>
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
              <TableCell numeric>{moneyFull(v.amount)}</TableCell>
              <TableCell>
                <RiskBadge level={v.risk} size="sm" />
              </TableCell>
            </TableRow>
          );
        })}
      />
    </div>
  );
}

function Products({ invoices }: { invoices: Invoices }) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { name: string; amount: number; qty: number; count: number; over: number }
    >();
    for (const i of invoices) {
      const prev = map.get(i.product) ?? {
        name: i.product,
        amount: 0,
        qty: 0,
        count: 0,
        over: 0,
      };
      prev.amount += i.amount;
      prev.qty += i.qty;
      prev.count += 1;
      if (i.avgPrice && i.price > i.avgPrice) prev.over += 1;
      map.set(i.product, prev);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [invoices]);

  const bars = rows.slice(0, 8).map((r) => ({
    label: r.name,
    value: r.amount,
    display: money(r.amount),
    hint: `${r.count} ЭСФ`,
  }));

  return (
    <Stagger>
      <SectionCard icon={Package} title="Товары, работы и услуги" collapsible={false}>
        <BarList items={bars} />
      </SectionCard>

      <SectionCard icon={Package} title="Реестр ТРУ" collapsible={false}>
        <RegistryTable
          total={rows.length}
          unit={["позиция", "позиции", "позиций"]}
          empty={{ title: "Позиции не найдены" }}
          head={
            <>
              <TableHead>Наименование</TableHead>
              <TableHead numeric>Количество</TableHead>
              <TableHead numeric>ЭСФ</TableHead>
              <TableHead numeric>Сумма</TableHead>
              <TableHead numeric>Цена выше рынка</TableHead>
            </>
          }
          rows={rows.map((r) => (
            <TableRow key={r.name}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell numeric>{num(r.qty)}</TableCell>
              <TableCell numeric>{r.count}</TableCell>
              <TableCell numeric>{moneyFull(r.amount)}</TableCell>
              <TableCell numeric>
                {r.over ? (
                  <Badge tone="danger" size="sm">
                    {r.over}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        />
      </SectionCard>
    </Stagger>
  );
}

function Chains({ schemes }: { schemes: ReturnType<typeof useApp.getState>["db"]["schemes"] }) {
  /* Денежные схемы: те, где переходы подписаны назначением платежа. */
  const money_ = schemes.filter((s) => s.edges?.some((e) => e.assignment));

  return (
    <Stagger>
      {(money_.length ? money_ : schemes).map((s, i) => (
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
