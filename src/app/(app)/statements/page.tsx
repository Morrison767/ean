"use client";

/**
 * Модуль банковских выписок.
 *
 * Вкладки прежние: выписки, транзакции, подозрительные и цепочки. Отдельная
 * вкладка «Подозрительные» существует потому, что помеченные операции ищут
 * не фильтром по общему реестру, а как самостоятельный рабочий список.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Landmark,
  Network,
  Users,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { BarList } from "@/components/charts/bar-list";
import { SchemeChain } from "@/components/charts/scheme-chain";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from "@/components/ui/table";
import { groupSum } from "@/lib/aggregate";
import { money, moneyFull, num } from "@/lib/format";
import { cn, companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";

const TABS = [
  { id: "list", label: "Выписки", icon: FileText },
  { id: "tx", label: "Транзакции", icon: ArrowDownLeft },
  { id: "suspicious", label: "Подозрительные", icon: AlertTriangle },
  { id: "chain", label: "Цепочки", icon: Network },
];

type Statements = ReturnType<typeof useApp.getState>["db"]["statements"];
type Transactions = ReturnType<typeof useApp.getState>["db"]["transactions"];

export default function StatementsPage() {
  const statements = useApp((s) => s.db.statements);
  const transactions = useApp((s) => s.db.transactions);
  const schemes = useApp((s) => s.db.schemes);
  const [tab, setTab] = useState("list");

  const totals = useMemo(
    () => ({
      in: statements.reduce((s, x) => s + x.totalIn, 0),
      out: statements.reduce((s, x) => s + x.totalOut, 0),
      counterparties: statements.reduce((s, x) => s + x.counterparties, 0),
      suspicious: transactions.filter((t) => t.risk !== "none").length,
    }),
    [statements, transactions]
  );

  return (
    <Screen title="Банковские выписки" subtitle="Загруженные выписки и операции по счетам">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Выписок" value={num(statements.length)} icon={FileText} />
        <KpiTile label="Поступления" value={money(totals.in)} icon={ArrowDownLeft} tone="success" />
        <KpiTile label="Списания" value={money(totals.out)} icon={ArrowUpRight} />
        <KpiTile
          label="Подозрительных"
          value={num(totals.suspicious)}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      {tab === "list" && <StatementList statements={statements} transactions={transactions} />}
      {tab === "tx" && <TxTab transactions={transactions} />}
      {tab === "suspicious" && <SuspiciousTab transactions={transactions} />}
      {tab === "chain" && <ChainTab schemes={schemes} />}
    </Screen>
  );
}

function StatementList({
  statements,
  transactions,
}: {
  statements: Statements;
  transactions: Transactions;
}) {
  const [selected, setSelected] = useState<string | null>(statements[0]?.id ?? null);
  const rows = useMemo(
    () => transactions.filter((t) => t.stmtId === selected),
    [transactions, selected]
  );
  const current = statements.find((s) => s.id === selected);

  return (
    <Stagger>
      <SectionCard icon={Landmark} title="Выписки" collapsible={false}>
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Файл</TableHead>
                <TableHead>Владелец счёта</TableHead>
                <TableHead>Счёт</TableHead>
                <TableHead>Период</TableHead>
                <TableHead numeric>Операций</TableHead>
                <TableHead numeric>Поступления</TableHead>
                <TableHead numeric>Списания</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((s) => (
                <TableRow
                  key={s.id}
                  interactive
                  onClick={() => setSelected(s.id)}
                  className={cn(selected === s.id && "bg-accent/50")}
                >
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{companyCase(s.holder)}</TableCell>
                  <TableCell className="tabular-nums">{s.account}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{s.period}</TableCell>
                  <TableCell numeric>{s.txCount}</TableCell>
                  <TableCell numeric className="text-success-foreground">
                    {moneyFull(s.totalIn)}
                  </TableCell>
                  <TableCell numeric>{moneyFull(s.totalOut)}</TableCell>
                  <TableCell>
                    <RiskBadge level={s.risk} size="sm" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>

      <SectionCard
        icon={ArrowDownLeft}
        title="Операции выбранной выписки"
        subtitle={current ? `${current.name} · ${current.period}` : "Выберите выписку"}
        collapsible={false}
      >
        <TxTable rows={rows} empty="По выбранной выписке операций не найдено" />
      </SectionCard>
    </Stagger>
  );
}

function TxTab({ transactions }: { transactions: Transactions }) {
  const f = useRegistryFilter(transactions, (t) => [
    t.counterparty,
    t.counterpartyBin,
    t.assignment,
    t.type,
  ]);

  /* Кто больше всего получил и кому больше всего ушло — двумя списками. */
  const inbound = useMemo(
    () =>
      groupSum(transactions.filter((t) => t.direction === "in"), (t) => t.counterparty, (t) => t.amount)
        .slice(0, 6)
        .map((g) => ({ label: companyCase(g.key), value: g.value, display: money(g.value), hint: `${g.count} оп.` })),
    [transactions]
  );
  const outbound = useMemo(
    () =>
      groupSum(transactions.filter((t) => t.direction === "out"), (t) => t.counterparty, (t) => t.amount)
        .slice(0, 6)
        .map((g) => ({ label: companyCase(g.key), value: g.value, display: money(g.value), hint: `${g.count} оп.` })),
    [transactions]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={ArrowDownLeft} title="Крупнейшие поступления" collapsible={false}>
          <BarList items={inbound} />
        </SectionCard>
        <SectionCard icon={ArrowUpRight} title="Крупнейшие списания" collapsible={false}>
          <BarList items={outbound} />
        </SectionCard>
      </div>

      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Контрагент, БИН или назначение платежа"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["операция", "операции", "операций"]}
        empty={{ title: "Операции не найдены", description: "Измените запрос или фильтр." }}
        head={<TxHead />}
        rows={f.filtered.map((t) => (
          <TxRow key={t.id} t={t} />
        ))}
      />
    </div>
  );
}

function SuspiciousTab({ transactions }: { transactions: Transactions }) {
  const rows = useMemo(
    () => transactions.filter((t) => t.risk !== "none" || (t.flags?.length ?? 0) > 0),
    [transactions]
  );

  return (
    <Stagger>
      <SectionCard
        icon={AlertTriangle}
        title="Подозрительные операции"
        subtitle={`${rows.length} из ${transactions.length} требуют проверки`}
        collapsible={false}
      >
        <TxTable rows={rows} empty="Подозрительных операций не выявлено" showFlags />
      </SectionCard>
    </Stagger>
  );
}

function ChainTab({ schemes }: { schemes: ReturnType<typeof useApp.getState>["db"]["schemes"] }) {
  const chains = schemes.filter((s) => s.edges?.some((e) => e.assignment || e.tx));

  return (
    <Stagger>
      {(chains.length ? chains : schemes).map((s, i) => (
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

/* ------------------------------- общие части ------------------------------- */

function TxHead() {
  return (
    <>
      <TableHead>Дата</TableHead>
      <TableHead>Контрагент</TableHead>
      <TableHead>БИН</TableHead>
      <TableHead>Назначение</TableHead>
      <TableHead>Направление</TableHead>
      <TableHead numeric>Сумма</TableHead>
      <TableHead>Риск</TableHead>
    </>
  );
}

function TxRow({ t, showFlags }: { t: Transactions[number]; showFlags?: boolean }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap tabular-nums">{t.date}</TableCell>
      <TableCell className="font-medium">{companyCase(t.counterparty)}</TableCell>
      <TableCell className="tabular-nums">{t.counterpartyBin}</TableCell>
      <TableCell>
        {t.assignment}
        {showFlags && t.flags && t.flags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {t.flags.map((fl) => (
              <Badge key={fl} tone="danger" size="sm">
                {fl}
              </Badge>
            ))}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge tone={t.direction === "in" ? "success" : "neutral"} size="sm">
          {t.direction === "in" ? "Поступление" : "Списание"}
        </Badge>
      </TableCell>
      <TableCell numeric className={cn(t.direction === "in" && "text-success-foreground")}>
        {moneyFull(t.amount)}
      </TableCell>
      <TableCell>
        <RiskBadge level={t.risk} size="sm" />
      </TableCell>
    </TableRow>
  );
}

function TxTable({
  rows,
  empty,
  showFlags,
}: {
  rows: Transactions;
  empty: string;
  showFlags?: boolean;
}) {
  return (
    <TableWrap>
      <Table>
        <TableHeader>
          <TableRow>
            <TxHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((t) => <TxRow key={t.id} t={t} showFlags={showFlags} />)
          )}
        </TableBody>
      </Table>
    </TableWrap>
  );
}
