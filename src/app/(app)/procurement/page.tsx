"use client";

/**
 * Модуль госзакупок.
 *
 * Вкладки прежние: дашборд, реестр закупок, участники и сеть закупок.
 * «Сеть» — не украшение: картельные признаки видны не в отдельной строке, а в
 * том, что одни и те же поставщики ходят к одним и тем же заказчикам.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  LayoutDashboard,
  Network,
  ShoppingCart,
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
  { id: "list", label: "Закупки", icon: ShoppingCart },
  { id: "participants", label: "Участники", icon: Users },
  { id: "network", label: "Сеть закупок", icon: Network },
];

type Procurements = ReturnType<typeof useApp.getState>["db"]["procurements"];

export default function ProcurementPage() {
  const procurements = useApp((s) => s.db.procurements);
  const schemes = useApp((s) => s.db.schemes);
  const [tab, setTab] = useState("dashboard");

  const totalAmount = useMemo(
    () => procurements.reduce((s, p) => s + p.contractAmount, 0),
    [procurements]
  );
  const singleSource = useMemo(
    () => procurements.filter((p) => p.participants <= 1).length,
    [procurements]
  );
  const risky = useMemo(
    () => procurements.filter((p) => p.risk !== "none").length,
    [procurements]
  );

  return (
    <Screen
      title="Государственные закупки"
      subtitle="Анализ гос. и квазигос. закупок: коррупционные риски, картели, конфликт интересов"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Закупок" value={num(procurements.length)} icon={ShoppingCart} />
        <KpiTile label="Сумма договоров" value={money(totalAmount)} icon={Wallet} />
        <KpiTile label="Один участник" value={num(singleSource)} icon={Users} tone="warning" />
        <KpiTile label="Выявлено рисков" value={num(risky)} icon={AlertTriangle} tone="danger" />
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      {tab === "dashboard" && <Dashboard items={procurements} />}
      {tab === "list" && <List items={procurements} />}
      {tab === "participants" && <Participants items={procurements} />}
      {tab === "network" && <NetworkTab items={procurements} schemes={schemes} />}
    </Screen>
  );
}

function Dashboard({ items }: { items: Procurements }) {
  const trend = useMemo(
    () =>
      byPeriod(items, (p) => p.date, (p) => p.contractAmount, "year").map((g) => ({
        label: g.key,
        value: g.value,
        display: money(g.value),
      })),
    [items]
  );

  const winners = useMemo(
    () =>
      groupSum(items, (p) => p.winner, (p) => p.contractAmount).map((g) => ({
        label: companyCase(g.key),
        value: g.value,
        display: money(g.value),
        hint: `${g.count} закупок`,
      })),
    [items]
  );

  const customers = useMemo(
    () =>
      groupSum(items, (p) => p.customer, (p) => p.contractAmount).map((g) => ({
        label: companyCase(g.key),
        value: g.value,
        display: money(g.value),
        hint: `${g.count} закупок`,
      })),
    [items]
  );

  const byMethod = useMemo(
    () =>
      groupSum(items, (p) => p.method, (p) => p.contractAmount).map((g) => ({
        label: g.key,
        value: g.value,
        display: money(g.value),
        hint: `${g.count}`,
      })),
    [items]
  );

  return (
    <Stagger>
      <SectionCard icon={TrendingUp} title="Динамика объёма закупок" collapsible={false}>
        <Trend points={trend} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={Users} title="Топ поставщиков по сумме" collapsible={false}>
          <BarList items={winners} />
        </SectionCard>
        <SectionCard icon={Users} title="Топ заказчиков по сумме" collapsible={false}>
          <BarList items={customers} />
        </SectionCard>
      </div>

      <SectionCard icon={ShoppingCart} title="Способы закупки" collapsible={false}>
        <BarList items={byMethod} />
      </SectionCard>
    </Stagger>
  );
}

function List({ items }: { items: Procurements }) {
  const f = useRegistryFilter(items, (p) => [
    p.id,
    p.customer,
    p.winner,
    p.subject,
    p.customerBin,
    p.winnerBin,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Номер закупки, заказчик, поставщик или предмет"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["закупка", "закупки", "закупок"]}
        empty={{
          title: "Закупки не найдены",
          description: "Измените запрос или снимите фильтр по риску.",
        }}
        head={
          <>
            <TableHead>Номер</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Заказчик</TableHead>
            <TableHead>Предмет</TableHead>
            <TableHead>Способ</TableHead>
            <TableHead numeric>Участников</TableHead>
            <TableHead>Победитель</TableHead>
            <TableHead numeric>Сумма</TableHead>
            <TableHead numeric>Выше рынка</TableHead>
            <TableHead>Риск</TableHead>
          </>
        }
        rows={f.filtered.map((p) => {
          const over =
            p.marketAmount && p.marketAmount > 0
              ? ((p.contractAmount - p.marketAmount) / p.marketAmount) * 100
              : null;
          return (
            <TableRow key={p.id}>
              <TableCell className="whitespace-nowrap tabular-nums font-medium">{p.id}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{p.date}</TableCell>
              <TableCell>{companyCase(p.customer)}</TableCell>
              <TableCell>{p.subject}</TableCell>
              <TableCell className="text-muted-foreground">
                {p.participants <= 1 ? (
                  <Badge tone="warning" size="sm">
                    {p.method}
                  </Badge>
                ) : (
                  p.method
                )}
              </TableCell>
              <TableCell numeric>{p.participants}</TableCell>
              <TableCell>{companyCase(p.winner)}</TableCell>
              <TableCell numeric>{moneyFull(p.contractAmount)}</TableCell>
              <TableCell numeric>
                {over == null ? (
                  <span className="text-faint">—</span>
                ) : (
                  <Badge tone={over > 25 ? "danger" : over > 0 ? "warning" : "success"} size="sm">
                    {over > 0 ? "+" : ""}
                    {percent(over)}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <RiskBadge level={p.risk} size="sm" />
              </TableCell>
            </TableRow>
          );
        })}
      />
    </div>
  );
}

function Participants({ items }: { items: Procurements }) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        bin: string;
        wins: number;
        amount: number;
        customers: Set<string>;
        single: number;
      }
    >();
    for (const p of items) {
      const prev = map.get(p.winnerBin) ?? {
        name: p.winner,
        bin: p.winnerBin,
        wins: 0,
        amount: 0,
        customers: new Set<string>(),
        single: 0,
      };
      prev.wins += 1;
      prev.amount += p.contractAmount;
      prev.customers.add(p.customerBin);
      if (p.participants <= 1) prev.single += 1;
      map.set(p.winnerBin, prev);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [items]);

  return (
    <Stagger>
      <SectionCard
        icon={Users}
        title="Поставщики"
        subtitle="Концентрация побед и круг заказчиков — признаки сговора"
        collapsible={false}
      >
        <RegistryTable
          total={rows.length}
          unit={["поставщик", "поставщика", "поставщиков"]}
          empty={{ title: "Участники не найдены" }}
          head={
            <>
              <TableHead>Поставщик</TableHead>
              <TableHead>БИН</TableHead>
              <TableHead numeric>Побед</TableHead>
              <TableHead numeric>Сумма</TableHead>
              <TableHead numeric>Заказчиков</TableHead>
              <TableHead numeric>Из одного источника</TableHead>
            </>
          }
          rows={rows.map((r) => (
            <TableRow key={r.bin}>
              <TableCell className="font-medium">{companyCase(r.name)}</TableCell>
              <TableCell className="tabular-nums">{r.bin}</TableCell>
              <TableCell numeric>{r.wins}</TableCell>
              <TableCell numeric>{moneyFull(r.amount)}</TableCell>
              <TableCell numeric>
                {/* Один заказчик на несколько побед — повод присмотреться. */}
                {r.customers.size === 1 && r.wins > 1 ? (
                  <Badge tone="warning" size="sm">
                    {r.customers.size}
                  </Badge>
                ) : (
                  r.customers.size
                )}
              </TableCell>
              <TableCell numeric>
                {r.single ? (
                  <Badge tone="danger" size="sm">
                    {r.single}
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

function NetworkTab({
  items,
  schemes,
}: {
  items: Procurements;
  schemes: ReturnType<typeof useApp.getState>["db"]["schemes"];
}) {
  /* Пары «заказчик → поставщик»: сеть закупок в самом простом виде. */
  const pairs = useMemo(() => {
    const map = new Map<string, { customer: string; winner: string; n: number; amount: number }>();
    for (const p of items) {
      const k = `${p.customerBin}→${p.winnerBin}`;
      const prev = map.get(k) ?? { customer: p.customer, winner: p.winner, n: 0, amount: 0 };
      prev.n += 1;
      prev.amount += p.contractAmount;
      map.set(k, prev);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [items]);

  const cartel = schemes.filter((s) => /картел|закуп/i.test(s.title));

  return (
    <Stagger>
      <SectionCard
        icon={Network}
        title="Связки «заказчик — поставщик»"
        subtitle="Повторяющаяся пара при малом числе участников — признак картеля"
        collapsible={false}
      >
        <RegistryTable
          total={pairs.length}
          unit={["связка", "связки", "связок"]}
          empty={{ title: "Связок не найдено" }}
          head={
            <>
              <TableHead>Заказчик</TableHead>
              <TableHead>Поставщик</TableHead>
              <TableHead numeric>Закупок</TableHead>
              <TableHead numeric>Сумма</TableHead>
            </>
          }
          rows={pairs.map((p, i) => (
            <TableRow key={i}>
              <TableCell>{companyCase(p.customer)}</TableCell>
              <TableCell className="font-medium">{companyCase(p.winner)}</TableCell>
              <TableCell numeric>
                {p.n > 1 ? (
                  <Badge tone="warning" size="sm">
                    {p.n}
                  </Badge>
                ) : (
                  p.n
                )}
              </TableCell>
              <TableCell numeric>{moneyFull(p.amount)}</TableCell>
            </TableRow>
          ))}
        />
      </SectionCard>

      {cartel.map((s, i) => (
        <SectionCard
          key={`${s.title}-${i}`}
          icon={AlertTriangle}
          title={s.title}
          collapsible={false}
        >
          <SchemeChain scheme={s} />
        </SectionCard>
      ))}
    </Stagger>
  );
}
