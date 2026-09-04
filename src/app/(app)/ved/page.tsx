"use client";

/**
 * Модуль ВЭД.
 *
 * Вкладки прежние: дашборд, товары по ТН ВЭД, контрагенты, реестр деклараций
 * и география с цепочками поставок. Импорт и экспорт всюду разведены по
 * отдельным блокам, а не по цветам одного графика: величины разного порядка,
 * и в общей шкале экспорт превращался бы в полоску у нуля.
 */

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Users,
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
import { SegmentedControl, UnderlineTabs } from "@/components/ui/tabs";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { byPeriod, groupSum } from "@/lib/aggregate";
import { num, usd } from "@/lib/format";
import { COUNTRY_NAME } from "@/config/countries";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";

const TABS = [
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "products", label: "Товары (ТН ВЭД)", icon: Package },
  { id: "participants", label: "Контрагенты ВЭД", icon: Users },
  { id: "operations", label: "Реестр деклараций (ГТД)", icon: Globe },
  { id: "geography", label: "География и Цепочки", icon: MapIcon },
];

type Declarations = ReturnType<typeof useApp.getState>["db"]["declarations"];

export default function VedPage() {
  const declarations = useApp((s) => s.db.declarations);
  const schemes = useApp((s) => s.db.schemes);
  const [tab, setTab] = useState("dashboard");

  const totals = useMemo(
    () => ({
      import: declarations.filter((d) => d.type === "import").reduce((s, d) => s + d.valueUsd, 0),
      export: declarations.filter((d) => d.type === "export").reduce((s, d) => s + d.valueUsd, 0),
      risky: declarations.filter((d) => d.risk !== "none").length,
    }),
    [declarations]
  );

  return (
    <Screen
      title="Внешнеэкономическая деятельность"
      subtitle="Таможенные декларации: контрагенты, товары, стоимость и риски"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Деклараций" value={num(declarations.length)} icon={Globe} />
        <KpiTile label="Импорт" value={usd(totals.import)} icon={ArrowDownToLine} />
        <KpiTile label="Экспорт" value={usd(totals.export)} icon={ArrowUpFromLine} tone="success" />
        <KpiTile label="С признаками риска" value={num(totals.risky)} icon={Package} tone="danger" />
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      {tab === "dashboard" && <Dashboard items={declarations} />}
      {tab === "products" && <Products items={declarations} />}
      {tab === "participants" && <Participants items={declarations} />}
      {tab === "operations" && <Operations items={declarations} />}
      {tab === "geography" && <Geography items={declarations} schemes={schemes} />}
    </Screen>
  );
}

/** Ряды импорта и экспорта по годам — двумя графиками, а не одним. */
function Dashboard({ items }: { items: Declarations }) {
  const mk = (kind: "import" | "export") =>
    byPeriod(items.filter((d) => d.type === kind), (d) => d.date, (d) => d.valueUsd, "year").map(
      (g) => ({ label: g.key, value: g.value, display: usd(g.value) })
    );

  const imp = useMemo(() => mk("import"), [items]);
  const exp = useMemo(() => mk("export"), [items]);

  const topImport = useMemo(
    () =>
      groupSum(items.filter((d) => d.type === "import"), (d) => d.product, (d) => d.valueUsd)
        .slice(0, 8)
        .map((g) => ({ label: g.key, value: g.value, display: usd(g.value), hint: `${g.count} ДТ` })),
    [items]
  );

  const topExport = useMemo(
    () =>
      groupSum(items.filter((d) => d.type === "export"), (d) => d.product, (d) => d.valueUsd)
        .slice(0, 8)
        .map((g) => ({ label: g.key, value: g.value, display: usd(g.value), hint: `${g.count} ДТ` })),
    [items]
  );

  return (
    <Stagger>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={ArrowDownToLine} title="Импорт по годам" collapsible={false}>
          <Trend points={imp} />
        </SectionCard>
        <SectionCard icon={ArrowUpFromLine} title="Экспорт по годам" collapsible={false}>
          <Trend points={exp} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={Package} title="Ввозимые товары" collapsible={false}>
          <BarList items={topImport} />
        </SectionCard>
        <SectionCard icon={Package} title="Вывозимые товары" collapsible={false}>
          <BarList items={topExport} />
        </SectionCard>
      </div>
    </Stagger>
  );
}

function Products({ items }: { items: Declarations }) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; qty: number; value: number; count: number; risky: number }
    >();
    for (const d of items) {
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
  }, [items]);

  return (
    <Stagger>
      <SectionCard icon={Package} title="Товарные группы" collapsible={false}>
        <BarList
          items={rows.slice(0, 8).map((r) => ({
            label: r.name,
            value: r.value,
            display: usd(r.value),
            hint: r.code,
          }))}
        />
      </SectionCard>

      <SectionCard icon={Package} title="Реестр ТН ВЭД" collapsible={false}>
        <RegistryTable
          total={rows.length}
          unit={["группа", "группы", "групп"]}
          empty={{ title: "Товарные группы не найдены" }}
          head={
            <>
              <TableHead>Код ТН ВЭД</TableHead>
              <TableHead>Наименование</TableHead>
              <TableHead numeric>Количество</TableHead>
              <TableHead numeric>Деклараций</TableHead>
              <TableHead numeric>Стоимость</TableHead>
              <TableHead numeric>С риском</TableHead>
            </>
          }
          rows={rows.map((r) => (
            <TableRow key={r.code}>
              <TableCell className="tabular-nums font-medium">{r.code}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell numeric>{num(r.qty)}</TableCell>
              <TableCell numeric>{r.count}</TableCell>
              <TableCell numeric>{usd(r.value)}</TableCell>
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

function Participants({ items }: { items: Declarations }) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { partner: string; countries: Set<string>; value: number; count: number; risky: number }
    >();
    for (const d of items) {
      const prev = map.get(d.partner) ?? {
        partner: d.partner,
        countries: new Set<string>(),
        value: 0,
        count: 0,
        risky: 0,
      };
      prev.countries.add(d.countryCode);
      prev.value += d.valueUsd;
      prev.count += 1;
      if (d.risk !== "none") prev.risky += 1;
      map.set(d.partner, prev);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [items]);

  return (
    <Stagger>
      <SectionCard
        icon={Users}
        title="Иностранные контрагенты"
        subtitle={`${rows.length} партнёров`}
        collapsible={false}
      >
        <RegistryTable
          total={rows.length}
          unit={["контрагент", "контрагента", "контрагентов"]}
          empty={{ title: "Контрагенты не найдены" }}
          head={
            <>
              <TableHead>Партнёр</TableHead>
              <TableHead>Страны</TableHead>
              <TableHead numeric>Деклараций</TableHead>
              <TableHead numeric>Стоимость</TableHead>
              <TableHead numeric>С риском</TableHead>
            </>
          }
          rows={rows.map((r) => (
            <TableRow key={r.partner}>
              <TableCell className="font-medium">{r.partner}</TableCell>
              <TableCell>
                {[...r.countries].map((c) => COUNTRY_NAME[c] ?? c).join(", ")}
              </TableCell>
              <TableCell numeric>{r.count}</TableCell>
              <TableCell numeric>{usd(r.value)}</TableCell>
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

function Operations({ items }: { items: Declarations }) {
  const [dir, setDir] = useState<"all" | "import" | "export">("all");
  const byDir = useMemo(
    () => (dir === "all" ? items : items.filter((d) => d.type === dir)),
    [items, dir]
  );
  const f = useRegistryFilter(byDir, (d) => [
    d.id,
    d.company,
    d.partner,
    d.product,
    d.hsCode,
    d.bin,
    d.countryCode,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        value={dir}
        onChange={(v) => setDir(v as typeof dir)}
        items={[
          { id: "all", label: "Все направления", count: items.length },
          { id: "import", label: "Импорт", count: items.filter((d) => d.type === "import").length },
          { id: "export", label: "Экспорт", count: items.filter((d) => d.type === "export").length },
        ]}
      />
      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Номер ДТ, компания, партнёр, товар или код ТН ВЭД"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["декларация", "декларации", "деклараций"]}
        empty={{
          title: "Декларации не найдены",
          description: "Измените запрос, направление или фильтр по риску.",
        }}
        head={
          <>
            <TableHead>Номер ДТ</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Направление</TableHead>
            <TableHead>Компания</TableHead>
            <TableHead>Партнёр</TableHead>
            <TableHead>Страна</TableHead>
            <TableHead>Товар</TableHead>
            <TableHead>ТН ВЭД</TableHead>
            <TableHead numeric>Стоимость</TableHead>
            <TableHead>Риск</TableHead>
          </>
        }
        rows={f.filtered.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="whitespace-nowrap font-medium">{d.id}</TableCell>
            <TableCell className="whitespace-nowrap tabular-nums">{d.date}</TableCell>
            <TableCell>
              <Badge tone={d.type === "import" ? "indigo" : "teal"} size="sm">
                {d.type === "import" ? "Импорт" : "Экспорт"}
              </Badge>
            </TableCell>
            <TableCell>{companyCase(d.company)}</TableCell>
            <TableCell>{d.partner}</TableCell>
            <TableCell>{COUNTRY_NAME[d.countryCode] ?? d.countryCode}</TableCell>
            <TableCell>{d.product}</TableCell>
            <TableCell className="tabular-nums">{d.hsCode}</TableCell>
            <TableCell numeric>{usd(d.valueUsd)}</TableCell>
            <TableCell>
              <RiskBadge level={d.risk} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

function Geography({
  items,
  schemes,
}: {
  items: Declarations;
  schemes: ReturnType<typeof useApp.getState>["db"]["schemes"];
}) {
  const mk = (kind: "import" | "export") =>
    groupSum(items.filter((d) => d.type === kind), (d) => d.countryCode, (d) => d.valueUsd).map(
      (g) => ({
        label: COUNTRY_NAME[g.key] ?? g.key,
        value: g.value,
        display: usd(g.value),
        hint: `${g.count} ДТ`,
      })
    );

  const imp = useMemo(() => mk("import"), [items]);
  const exp = useMemo(() => mk("export"), [items]);

  /* Цепочки поставок: схемы, у которых переходы помечены наценкой или разрывом. */
  const chains = schemes.filter((s) => s.edges?.some((e) => e.flag === "markup" || e.flag === "break"));

  return (
    <Stagger>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={ArrowDownToLine} title="Импорт по странам" collapsible={false}>
          <BarList items={imp} />
        </SectionCard>
        <SectionCard icon={ArrowUpFromLine} title="Экспорт по странам" collapsible={false}>
          <BarList items={exp} />
        </SectionCard>
      </div>

      {chains.map((s, i) => (
        <SectionCard
          key={`${s.title}-${i}`}
          icon={MapIcon}
          title={s.title}
          subtitle="Цепочка поставки с наценкой посредников"
          collapsible={false}
        >
          <SchemeChain scheme={s} />
        </SectionCard>
      ))}
    </Stagger>
  );
}
