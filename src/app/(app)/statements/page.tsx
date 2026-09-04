"use client";

/**
 * Банковские выписки.
 *
 * Два уровня: список загруженных выписок и операции внутри выбранной. Выбор
 * выписки не уводит на отдельную страницу — операции раскрываются под списком,
 * потому что аналитик сравнивает их между выписками и терять контекст не должен.
 */

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, FileText, Landmark, Users } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { KpiTile } from "@/components/ui/kpi-tile";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
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
import { money, moneyFull, num } from "@/lib/format";
import { cn, companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";

export default function StatementsPage() {
  const statements = useApp((s) => s.db.statements);
  const transactions = useApp((s) => s.db.transactions);

  /* По умолчанию раскрыта первая выписка: пустая нижняя половина экрана
     заставляла бы кликать, чтобы увидеть хоть что-то. */
  const [selected, setSelected] = useState<string | null>(statements[0]?.id ?? null);

  const totals = useMemo(
    () => ({
      in: statements.reduce((s, x) => s + x.totalIn, 0),
      out: statements.reduce((s, x) => s + x.totalOut, 0),
      counterparties: statements.reduce((s, x) => s + x.counterparties, 0),
    }),
    [statements]
  );

  const rows = useMemo(
    () => transactions.filter((t) => t.stmtId === selected),
    [transactions, selected]
  );

  const current = statements.find((s) => s.id === selected);

  return (
    <Screen
      title="Банковские выписки"
      subtitle="Загруженные выписки и операции по счетам"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Выписок" value={num(statements.length)} icon={FileText} />
        <KpiTile label="Поступления" value={money(totals.in)} icon={ArrowDownLeft} tone="success" />
        <KpiTile label="Списания" value={money(totals.out)} icon={ArrowUpRight} />
        <KpiTile label="Контрагентов" value={num(totals.counterparties)} icon={Users} />
      </div>

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
          title="Операции"
          subtitle={current ? `${current.name} · ${current.period}` : "Выберите выписку"}
          collapsible={false}
        >
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead>БИН</TableHead>
                  <TableHead>Назначение</TableHead>
                  <TableHead>Направление</TableHead>
                  <TableHead numeric>Сумма</TableHead>
                  <TableHead>Риск</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={7}>
                    По выбранной выписке операций не найдено
                  </TableEmpty>
                ) : (
                  rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">{t.date}</TableCell>
                      <TableCell className="font-medium">
                        {companyCase(t.counterparty)}
                      </TableCell>
                      <TableCell className="tabular-nums">{t.counterpartyBin}</TableCell>
                      <TableCell>{t.assignment}</TableCell>
                      <TableCell>
                        <Badge tone={t.direction === "in" ? "success" : "neutral"} size="sm">
                          {t.direction === "in" ? "Поступление" : "Списание"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        numeric
                        className={cn(t.direction === "in" && "text-success-foreground")}
                      >
                        {moneyFull(t.amount)}
                      </TableCell>
                      <TableCell>
                        <RiskBadge level={t.risk} size="sm" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      </Stagger>
    </Screen>
  );
}
