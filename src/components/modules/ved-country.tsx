"use client";

/**
 * ВЭД: сводка по стране.
 *
 * Здесь картина строится вокруг направления и географии: сальдо, кто ввозит и
 * вывозит, через какие страны и что именно. Обзор даёт выводы, «Реестр
 * деклараций» — первичные строки с фильтрами.
 */

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Scale,
  Search,
  Users,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { BarList } from "@/components/charts/bar-list";
import { ShareDonut } from "@/components/charts/share-donut";
import { Trend } from "@/components/charts/trend";
import type { MapPoint } from "@/components/charts/trade-map";
import { buildParticipants } from "@/components/modules/ved-module";
import { HeroStat, Insight, concentration } from "@/components/modules/country/shell";
import {
  RegistryTable,
  RegistryToolbar,
  useRegistryFilter,
} from "@/components/modules/registry";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { SegmentedControl, UnderlineTabs } from "@/components/ui/tabs";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { COUNTRY_NAME } from "@/config/countries";
import { byPeriod, groupSum } from "@/lib/aggregate";
import { num, percent, usd } from "@/lib/format";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";
import type { Declaration } from "@/data/types";

const TradeMap = dynamic(
  () => import("@/components/charts/trade-map").then((m) => m.TradeMap),
  { ssr: false, loading: () => <div className="m-4 h-[440px] animate-pulse rounded-12 bg-muted" /> }
);

const TABS = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "geography", label: "География", icon: MapIcon },
  { id: "participants", label: "Участники", icon: Users },
  { id: "registry", label: "Реестр деклараций", icon: Globe },
  { id: "products", label: "Товары (ТН ВЭД)", icon: Package },
];

export function VedCountry() {
  const router = useRouter();
  const declarations = useApp((s) => s.db.declarations);
  const companies = useApp((s) => s.db.companies);
  const [tab, setTab] = useState("overview");

  const participants = useMemo(
    () => buildParticipants(declarations, companies),
    [declarations, companies]
  );

  const imports = declarations.filter((d) => d.type === "import");
  const exports = declarations.filter((d) => d.type === "export");
  const sum = (xs: Declaration[]) => xs.reduce((s, d) => s + d.valueUsd, 0);
  const balance = sum(exports) - sum(imports);

  return (
    <Screen
      title="Внешнеэкономическая деятельность: сводка по стране"
      subtitle="Обороты, направления, страны-партнёры и товарные группы по всему реестру"
      actions={
        <Button variant="secondary" icon={Search} onClick={() => router.push("/ved")}>
          К поиску
        </Button>
      }
    >
      <button
        type="button"
        onClick={() => router.push("/ved")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Поиск по ВЭД
      </button>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <HeroStat label="Деклараций" value={num(declarations.length)} icon={Globe} />
        <HeroStat label="Импорт" value={usd(sum(imports))} hint={`${imports.length} ДТ`} icon={ArrowDownToLine} />
        <HeroStat
          label="Экспорт"
          value={usd(sum(exports))}
          hint={`${exports.length} ДТ`}
          icon={ArrowUpFromLine}
          tone="success"
        />
        <HeroStat
          label="Сальдо"
          value={usd(Math.abs(balance))}
          hint={balance >= 0 ? "профицит" : "дефицит"}
          icon={Scale}
          tone={balance >= 0 ? "success" : "danger"}
        />
        <HeroStat
          label="С признаками риска"
          value={num(declarations.filter((d) => d.risk !== "none").length)}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      {tab === "overview" && <Overview declarations={declarations} participants={participants} />}
      {tab === "geography" && <Geography declarations={declarations} />}
      {tab === "participants" && <Participants participants={participants} />}
      {tab === "registry" && <Registry declarations={declarations} />}
      {tab === "products" && <Products declarations={declarations} />}
    </Screen>
  );
}

type Participants = ReturnType<typeof buildParticipants>;

/* --------------------------------- Обзор --------------------------------- */

function Overview({
  declarations,
  participants,
}: {
  declarations: Declaration[];
  participants: Participants;
}) {
  const mkTrend = (kind: "import" | "export") =>
    byPeriod(declarations.filter((d) => d.type === kind), (d) => d.date, (d) => d.valueUsd, "year").map(
      (g) => ({ label: g.key, value: g.value, display: usd(g.value) })
    );

  const countries = groupSum(declarations, (d) => d.countryCode, (d) => d.valueUsd);
  const conc = concentration(countries.map((c) => c.value));
  const topCountry = countries[0];
  const riskValue = declarations
    .filter((d) => d.risk !== "none")
    .reduce((s, d) => s + d.valueUsd, 0);
  const total = declarations.reduce((s, d) => s + d.valueUsd, 0);

  return (
    <Stagger>
      <div className="grid gap-3 lg:grid-cols-3">
        <Insight
          icon={MapIcon}
          tone={conc.share > 60 ? "warning" : "neutral"}
          title="Концентрация по странам"
          value={percent(conc.share)}
          detail={`оборота приходится на три страны из ${countries.length}`}
        />
        <Insight
          icon={Globe}
          tone="neutral"
          title="Главный партнёр"
          value={COUNTRY_NAME[topCountry?.key ?? ""] ?? topCountry?.key ?? "—"}
          detail={`${usd(topCountry?.value ?? 0)} · ${topCountry?.count ?? 0} деклараций`}
        />
        <Insight
          icon={AlertTriangle}
          tone={riskValue / Math.max(total, 1) > 0.3 ? "danger" : "neutral"}
          title="Оборот под риском"
          value={usd(riskValue)}
          detail={`${percent((riskValue / Math.max(total, 1)) * 100)} стоимости всех деклараций`}
        />
      </div>

      {/* Импорт и экспорт — разного порядка величины, поэтому двумя графиками. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={ArrowDownToLine} title="Импорт по годам" collapsible={false}>
          <Trend points={mkTrend("import")} />
        </SectionCard>
        <SectionCard icon={ArrowUpFromLine} title="Экспорт по годам" collapsible={false}>
          <Trend points={mkTrend("export")} />
        </SectionCard>
      </div>

      <SectionCard icon={Users} title="Крупнейшие участники по обороту" collapsible={false}>
        <BarList
          items={participants.slice(0, 8).map((p) => ({
            label: companyCase(p.name),
            value: p.turnover,
            display: usd(p.turnover),
            hint: `${p.declarations} ДТ`,
          }))}
        />
      </SectionCard>
    </Stagger>
  );
}

/* ------------------------------- География ------------------------------- */

function Geography({ declarations }: { declarations: Declaration[] }) {
  const points: MapPoint[] = useMemo(() => {
    const map = new Map<string, MapPoint>();
    for (const d of declarations) {
      const prev = map.get(d.countryCode);
      if (!prev) {
        map.set(d.countryCode, {
          code: d.countryCode,
          total: d.valueUsd,
          operations: 1,
          risk: d.risk,
          kind: d.type,
        });
        continue;
      }
      prev.total += d.valueUsd;
      prev.operations += 1;
      if (d.risk === "high" || (d.risk === "medium" && prev.risk === "none")) prev.risk = d.risk;
      if (prev.kind !== d.type) prev.kind = "both";
    }
    return [...map.values()];
  }, [declarations]);

  const mk = (kind: "import" | "export") =>
    groupSum(declarations.filter((d) => d.type === kind), (d) => d.countryCode, (d) => d.valueUsd).map(
      (g) => ({ key: g.key, label: COUNTRY_NAME[g.key] ?? g.key, value: g.value, display: usd(g.value) })
    );

  return (
    <Stagger>
      <SectionCard icon={MapIcon} title="Карта внешней торговли" collapsible={false}>
        <TradeMap points={points} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={ArrowDownToLine} title="Импорт по странам" collapsible={false}>
          <ShareDonut items={mk("import")} columns={["Страна", "Импорт"]} />
        </SectionCard>
        <SectionCard icon={ArrowUpFromLine} title="Экспорт по странам" collapsible={false}>
          <ShareDonut items={mk("export")} columns={["Страна", "Экспорт"]} />
        </SectionCard>
      </div>
    </Stagger>
  );
}

/* ------------------------------- Участники ------------------------------- */

function Participants({ participants }: { participants: Participants }) {
  const router = useRouter();
  const f = useRegistryFilter(participants, (p) => [p.name, p.bin, p.activity]);

  return (
    <div className="flex flex-col gap-4">
      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Компания, БИН или вид деятельности"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["участник", "участника", "участников"]}
        empty={{ title: "Участники не найдены", description: "Измените запрос или фильтр." }}
        head={
          <>
            <TableHead>Компания</TableHead>
            <TableHead>БИН</TableHead>
            <TableHead numeric>Импорт</TableHead>
            <TableHead numeric>Экспорт</TableHead>
            <TableHead numeric>Деклараций</TableHead>
            <TableHead>Риск</TableHead>
          </>
        }
        rows={f.filtered.map((p) => (
          <TableRow key={p.bin} interactive onClick={() => router.push(`/ved/${p.bin}`)}>
            <TableCell className="font-medium">{companyCase(p.name)}</TableCell>
            <TableCell className="tabular-nums">{p.bin}</TableCell>
            <TableCell numeric>{p.imports ? usd(p.imports) : "—"}</TableCell>
            <TableCell numeric>{p.exports ? usd(p.exports) : "—"}</TableCell>
            <TableCell numeric>{p.declarations}</TableCell>
            <TableCell>
              <RiskBadge level={p.risk} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

/* --------------------------- Реестр деклараций --------------------------- */

function Registry({ declarations }: { declarations: Declaration[] }) {
  const [dir, setDir] = useState<"all" | "import" | "export">("all");
  const scoped = useMemo(
    () => (dir === "all" ? declarations : declarations.filter((d) => d.type === dir)),
    [declarations, dir]
  );
  const f = useRegistryFilter(scoped, (d) => [
    d.id,
    d.company,
    d.partner,
    d.product,
    d.hsCode,
    d.bin,
    COUNTRY_NAME[d.countryCode] ?? d.countryCode,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        value={dir}
        onChange={(v) => setDir(v as typeof dir)}
        items={[
          { id: "all", label: "Все направления", count: declarations.length },
          { id: "import", label: "Импорт", count: declarations.filter((d) => d.type === "import").length },
          { id: "export", label: "Экспорт", count: declarations.filter((d) => d.type === "export").length },
        ]}
      />
      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Номер ДТ, компания, партнёр, товар, страна или код ТН ВЭД"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["декларация", "декларации", "деклараций"]}
        empty={{ title: "Декларации не найдены", description: "Измените запрос или фильтры." }}
        head={
          <>
            <TableHead>Номер ДТ</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Направление</TableHead>
            <TableHead>Компания</TableHead>
            <TableHead>Партнёр</TableHead>
            <TableHead>Страна</TableHead>
            <TableHead>Товар</TableHead>
            <TableHead numeric>Количество</TableHead>
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
            <TableCell numeric className="whitespace-nowrap">
              {num(d.qty)} {d.unit}
            </TableCell>
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

/* --------------------------------- Товары --------------------------------- */

function Products({ declarations }: { declarations: Declaration[] }) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        name: string;
        value: number;
        qty: number;
        count: number;
        countries: Set<string>;
        units: Set<string>;
      }
    >();
    for (const d of declarations) {
      const prev = map.get(d.hsCode) ?? {
        code: d.hsCode,
        name: d.product,
        value: 0,
        qty: 0,
        count: 0,
        countries: new Set<string>(),
        units: new Set<string>(),
      };
      prev.value += d.valueUsd;
      prev.qty += d.qty;
      prev.count += 1;
      prev.countries.add(d.countryCode);
      prev.units.add(d.unit);
      map.set(d.hsCode, prev);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [declarations]);

  /* Количество складывается только внутри одной единицы измерения: тонны и
     штуки в одной сумме — число без смысла, поэтому при смешанных единицах
     показываем прочерк, а не итог. */
  const quantity = (r: { qty: number; units: Set<string> }) =>
    r.units.size === 1 ? `${num(r.qty)} ${[...r.units][0]}` : "—";

  return (
    <Stagger>
      <SectionCard icon={Package} title="Товарные группы по стоимости" collapsible={false}>
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
              <TableHead numeric>Стран</TableHead>
              <TableHead numeric>Деклараций</TableHead>
              <TableHead numeric>Стоимость</TableHead>
            </>
          }
          rows={rows.map((r) => (
            <TableRow key={r.code}>
              <TableCell className="tabular-nums font-medium">{r.code}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell numeric className="whitespace-nowrap">{quantity(r)}</TableCell>
              <TableCell numeric>{r.countries.size}</TableCell>
              <TableCell numeric>{r.count}</TableCell>
              <TableCell numeric>{usd(r.value)}</TableCell>
            </TableRow>
          ))}
        />
      </SectionCard>
    </Stagger>
  );
}
