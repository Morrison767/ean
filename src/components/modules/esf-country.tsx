"use client";

/**
 * ЭСФ: сводка по стране.
 *
 * Вход из посадочного поиска, когда искать конкретного контрагента не нужно, а
 * нужна картина целиком. Обзор отвечает на «что происходит», остальные вкладки
 * дают тот же материал в разрезах, а «Реестр ЭСФ» — полный список с фильтрами:
 * из сводки всегда должен быть путь к первичным строкам.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { BarList } from "@/components/charts/bar-list";
import { RISK_SHARE_COLOR, ShareDonut } from "@/components/charts/share-donut";
import { Trend } from "@/components/charts/trend";
import { buildCounterparties } from "@/components/modules/esf-module";
import { HeroStat, Insight, concentration } from "@/components/modules/country/shell";
import {
  RegistryTable,
  RegistryToolbar,
  useRegistryFilter,
} from "@/components/modules/registry";
import { InvoiceDialog } from "@/components/modules/invoice-dialog";
import { Badge, RISK_META, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { UnderlineTabs } from "@/components/ui/tabs";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { byPeriod, groupSum } from "@/lib/aggregate";
import { money, moneyFull, num, percent } from "@/lib/format";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";
import type { Invoice, RiskLevel } from "@/data/types";

const TABS = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "counterparties", label: "Контрагенты", icon: Users },
  { id: "registry", label: "Реестр ЭСФ", icon: FileSpreadsheet },
  { id: "products", label: "ТРУ", icon: Package },
  { id: "risks", label: "Риски", icon: AlertTriangle },
];

export function EsfCountry() {
  const router = useRouter();
  const invoices = useApp((s) => s.db.invoices);
  const [tab, setTab] = useState("overview");

  const parties = useMemo(() => buildCounterparties(invoices), [invoices]);
  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const risky = invoices.filter((i) => i.risk !== "none");
  /* Порог тот же, что у риск-сигнала в карточке контрагента: 15 % и выше.
     Считать здесь любое превышение значило бы дать в шапке одно число, а во
     вкладке «Риски» другое — по тому же признаку. */
  const overpriced = invoices.filter(
    (i) => i.avgPrice && (i.price - i.avgPrice) / i.avgPrice >= 0.15
  );

  return (
    <Screen
      title="Электронные счета-фактуры: сводка по стране"
      subtitle="Обороты, контрагенты, товары и риски по всему реестру ЭСФ"
      actions={
        <Button variant="secondary" icon={Search} onClick={() => router.push("/esf")}>
          К поиску
        </Button>
      }
    >
      <button
        type="button"
        onClick={() => router.push("/esf")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Поиск по ЭСФ
      </button>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <HeroStat label="Счетов-фактур" value={num(invoices.length)} icon={FileSpreadsheet} />
        <HeroStat label="Оборот" value={money(total)} icon={Wallet} />
        <HeroStat label="Контрагентов" value={num(parties.length)} icon={Users} />
        <HeroStat
          label="Цена выше рынка на 15 %+"
          value={num(overpriced.length)}
          hint={`${percent((overpriced.length / Math.max(invoices.length, 1)) * 100)} счетов`}
          icon={TrendingUp}
          tone="danger"
        />
        <HeroStat
          label="С признаками риска"
          value={num(risky.length)}
          hint={money(risky.reduce((s, i) => s + i.amount, 0))}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      {tab === "overview" && <Overview invoices={invoices} parties={parties} />}
      {tab === "counterparties" && <Counterparties parties={parties} />}
      {tab === "registry" && <Registry invoices={invoices} />}
      {tab === "products" && <Products invoices={invoices} />}
      {tab === "risks" && <Risks invoices={invoices} parties={parties} />}
    </Screen>
  );
}

type Parties = ReturnType<typeof buildCounterparties>;

/* --------------------------------- Обзор --------------------------------- */

function Overview({ invoices, parties }: { invoices: Invoice[]; parties: Parties }) {
  const trend = byPeriod(invoices, (i) => i.date, (i) => i.amount, "year").map((g) => ({
    label: g.key,
    value: g.value,
    display: money(g.value),
  }));

  const buyers = groupSum(invoices, (i) => i.customer, (i) => i.amount);
  const sellers = groupSum(invoices, (i) => i.supplier, (i) => i.amount);

  const conc = concentration(sellers.map((s) => s.value));
  const riskAmount = invoices.filter((i) => i.risk !== "none").reduce((s, i) => s + i.amount, 0);
  const total = invoices.reduce((s, i) => s + i.amount, 0);

  /* Самый частый товар — по числу счетов, а не по сумме: перекос по
     количеству сделок говорит о схеме, перекос по деньгам — о масштабе. */
  const byProduct = groupSum(invoices, (i) => i.product, () => 1);

  const riskShare = (["high", "medium", "none"] as RiskLevel[])
    .map((level) => ({
      key: level,
      label: RISK_META[level].label,
      value: invoices.filter((i) => i.risk === level).length,
      color: RISK_SHARE_COLOR[level],
    }))
    .filter((x) => x.value > 0)
    .map((x) => ({ ...x, display: `${x.value}` }));

  return (
    <Stagger>
      <div className="grid gap-3 lg:grid-cols-3">
        <Insight
          icon={Users}
          tone={conc.share > 60 ? "warning" : "neutral"}
          title="Концентрация оборота"
          value={percent(conc.share)}
          detail={`приходится на трёх крупнейших поставщиков из ${parties.length}`}
        />
        <Insight
          icon={AlertTriangle}
          tone={riskAmount / Math.max(total, 1) > 0.3 ? "danger" : "neutral"}
          title="Оборот под риском"
          value={money(riskAmount)}
          detail={`${percent((riskAmount / Math.max(total, 1)) * 100)} всего оборота по ЭСФ`}
        />
        <Insight
          icon={Package}
          tone="neutral"
          title="Самая частая позиция"
          value={byProduct[0]?.key ?? "—"}
          detail={`${byProduct[0]?.value ?? 0} счетов-фактур из ${invoices.length}`}
        />
      </div>

      <SectionCard icon={TrendingUp} title="Динамика оборота по годам" collapsible={false}>
        <Trend points={trend} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={Users} title="Крупнейшие поставщики" collapsible={false}>
          <BarList
            items={sellers.slice(0, 8).map((g) => ({
              label: companyCase(g.key),
              value: g.value,
              display: money(g.value),
              hint: `${g.count} ЭСФ`,
            }))}
          />
        </SectionCard>
        <SectionCard icon={Users} title="Крупнейшие покупатели" collapsible={false}>
          <BarList
            items={buyers.slice(0, 8).map((g) => ({
              label: companyCase(g.key),
              value: g.value,
              display: money(g.value),
              hint: `${g.count} ЭСФ`,
            }))}
          />
        </SectionCard>
      </div>

      <SectionCard icon={AlertTriangle} title="Распределение счетов по риску" collapsible={false}>
        <ShareDonut
          items={riskShare}
          columns={["Уровень риска", "Счетов"]}
          emptyText="Нет счетов-фактур"
        />
      </SectionCard>
    </Stagger>
  );
}

/* ------------------------------ Контрагенты ------------------------------ */

function Counterparties({ parties }: { parties: Parties }) {
  const router = useRouter();
  const f = useRegistryFilter(
    parties.map((p) => ({ ...p, risk: p.risk })),
    (p) => [p.name, p.bin, ...p.products]
  );

  return (
    <div className="flex flex-col gap-4">
      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Контрагент, БИН или товар"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["контрагент", "контрагента", "контрагентов"]}
        empty={{ title: "Контрагенты не найдены", description: "Измените запрос или фильтр." }}
        head={
          <>
            <TableHead>Наименование</TableHead>
            <TableHead>БИН</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead numeric>Реализация</TableHead>
            <TableHead numeric>Приобретения</TableHead>
            <TableHead numeric>ЭСФ</TableHead>
            <TableHead>Риск</TableHead>
          </>
        }
        rows={f.filtered.map((p) => (
          <TableRow key={p.bin} interactive onClick={() => router.push(`/esf/${p.bin}`)}>
            <TableCell className="font-medium">{companyCase(p.name)}</TableCell>
            <TableCell className="tabular-nums">{p.bin}</TableCell>
            <TableCell>
              <Badge tone="outline" size="sm">
                {p.kind === "ip" ? "ИП" : "Юр. лицо"}
              </Badge>
            </TableCell>
            <TableCell numeric>{p.asSupplier ? moneyFull(p.asSupplier) : "—"}</TableCell>
            <TableCell numeric>{p.asCustomer ? moneyFull(p.asCustomer) : "—"}</TableCell>
            <TableCell numeric>{p.operations}</TableCell>
            <TableCell>
              <RiskBadge level={p.risk} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

/* ------------------------------- Реестр ЭСФ ------------------------------- */

function Registry({ invoices }: { invoices: Invoice[] }) {
  const [opened, setOpened] = useState<Invoice | null>(null);
  const router = useRouter();
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
      <InvoiceDialog
        invoice={opened}
        onClose={() => setOpened(null)}
        onCounterparty={(bin) => {
          setOpened(null);
          router.push(`/esf/${bin}`);
        }}
      />

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
            <TableHead numeric>Откл.</TableHead>
            <TableHead numeric>Сумма</TableHead>
            <TableHead>Риск</TableHead>
          </>
        }
        rows={f.filtered.map((i) => {
          const delta =
            i.avgPrice && i.avgPrice > 0 ? ((i.price - i.avgPrice) / i.avgPrice) * 100 : null;
          return (
            <TableRow key={i.id} interactive onClick={() => setOpened(i)}>
              <TableCell className="whitespace-nowrap tabular-nums font-medium">{i.id}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{i.date}</TableCell>
              <TableCell>{companyCase(i.supplier)}</TableCell>
              <TableCell>{companyCase(i.customer)}</TableCell>
              <TableCell>{i.product}</TableCell>
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
        })}
      />
    </div>
  );
}

/* ---------------------------------- ТРУ ---------------------------------- */

function Products({ invoices }: { invoices: Invoice[] }) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { name: string; amount: number; qty: number; count: number; over: number; parties: Set<string> }
    >();
    for (const i of invoices) {
      const prev = map.get(i.product) ?? {
        name: i.product,
        amount: 0,
        qty: 0,
        count: 0,
        over: 0,
        parties: new Set<string>(),
      };
      prev.amount += i.amount;
      prev.qty += i.qty;
      prev.count += 1;
      prev.parties.add(i.supplierBin);
      if (i.avgPrice && i.price > i.avgPrice) prev.over += 1;
      map.set(i.product, prev);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [invoices]);

  return (
    <Stagger>
      <SectionCard icon={Package} title="Товары, работы и услуги по обороту" collapsible={false}>
        <BarList
          items={rows.slice(0, 8).map((r) => ({
            label: r.name,
            value: r.amount,
            display: money(r.amount),
            hint: `${r.count} ЭСФ`,
          }))}
        />
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
              <TableHead numeric>Поставщиков</TableHead>
              <TableHead numeric>ЭСФ</TableHead>
              <TableHead numeric>Сумма</TableHead>
              <TableHead numeric>Цена выше рынка</TableHead>
            </>
          }
          rows={rows.map((r) => (
            <TableRow key={r.name}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell numeric>{num(r.qty)}</TableCell>
              <TableCell numeric>{r.parties.size}</TableCell>
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

/* --------------------------------- Риски --------------------------------- */

function Risks({ invoices, parties }: { invoices: Invoice[]; parties: Parties }) {
  const router = useRouter();

  /* Самые дорогие отклонения: по ним начинают разбор. */
  const deviations = useMemo(
    () =>
      invoices
        .filter((i) => i.avgPrice && i.avgPrice > 0)
        .map((i) => ({
          invoice: i,
          pct: ((i.price - i.avgPrice!) / i.avgPrice!) * 100,
          overpay: Math.round((i.price - i.avgPrice!) * i.qty),
        }))
        .filter((x) => x.pct >= 15)
        .sort((a, b) => b.overpay - a.overpay),
    [invoices]
  );

  const risky = parties.filter((p) => p.risk !== "none").sort((a, b) => b.total - a.total);
  const overpayTotal = deviations.reduce((s, d) => s + d.overpay, 0);

  return (
    <Stagger>
      <div className="grid gap-3 lg:grid-cols-2">
        <Insight
          icon={TrendingUp}
          tone="danger"
          title="Совокупная переплата"
          value={money(overpayTotal)}
          detail={`по ${deviations.length} счетам с превышением рынка от 15 %`}
        />
        <Insight
          icon={Building2}
          tone={risky.length ? "warning" : "neutral"}
          title="Контрагенты с риском"
          value={`${risky.length} из ${parties.length}`}
          detail={`оборот ${money(risky.reduce((s, p) => s + p.total, 0))}`}
        />
      </div>

      <SectionCard
        icon={AlertTriangle}
        title="Наибольшие отклонения цены"
        subtitle="Отсортировано по сумме переплаты"
        collapsible={false}
      >
        <RegistryTable
          total={deviations.length}
          unit={["отклонение", "отклонения", "отклонений"]}
          empty={{ title: "Отклонений не найдено" }}
          head={
            <>
              <TableHead>Номер</TableHead>
              <TableHead>Товар</TableHead>
              <TableHead>Поставщик</TableHead>
              <TableHead numeric>Откл.</TableHead>
              <TableHead numeric>Переплата</TableHead>
            </>
          }
          rows={deviations.map((d) => (
            <TableRow
              key={d.invoice.id}
              interactive
              onClick={() => router.push(`/esf/${d.invoice.supplierBin}`)}
            >
              <TableCell className="whitespace-nowrap tabular-nums font-medium">
                {d.invoice.id}
              </TableCell>
              <TableCell>{d.invoice.product}</TableCell>
              <TableCell>{companyCase(d.invoice.supplier)}</TableCell>
              <TableCell numeric>
                <Badge tone="danger" size="sm">
                  +{percent(d.pct)}
                </Badge>
              </TableCell>
              <TableCell numeric>{moneyFull(d.overpay)}</TableCell>
            </TableRow>
          ))}
        />
      </SectionCard>
    </Stagger>
  );
}
