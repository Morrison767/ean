"use client";

/**
 * Реестр государственных закупок.
 *
 * Ключевые сигналы — способ закупки, число участников и разрыв между ценой
 * договора и рыночной. Все три вынесены в колонки: закупка из одного источника
 * с одним участником и наценкой в полтора раза должна читаться со строки.
 */

import { useMemo } from "react";
import { AlertTriangle, ShoppingCart, Users, Wallet } from "lucide-react";

import { Screen } from "@/components/app/screen";
import {
  RegistryTable,
  RegistryToolbar,
  useRegistryFilter,
} from "@/components/modules/registry";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { KpiTile } from "@/components/ui/kpi-tile";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { money, moneyFull, num, percent } from "@/lib/format";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";

export default function ProcurementPage() {
  const procurements = useApp((s) => s.db.procurements);
  const f = useRegistryFilter(procurements, (p) => [
    p.id,
    p.customer,
    p.winner,
    p.subject,
    p.customerBin,
    p.winnerBin,
  ]);

  const totalAmount = useMemo(
    () => procurements.reduce((s, p) => s + p.contractAmount, 0),
    [procurements]
  );
  const singleSource = useMemo(
    () => procurements.filter((p) => p.participants <= 1).length,
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
        <KpiTile
          label="Выявлено рисков"
          value={num(f.counts.risky)}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

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
    </Screen>
  );
}
