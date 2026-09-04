"use client";

/**
 * Реестр электронных счетов-фактур.
 *
 * Главный признак риска здесь — отрыв цены от среднерыночной, поэтому
 * отклонение считается прямо в таблице и выносится отдельной колонкой: без неё
 * аналитику пришлось бы делить цифры в уме на каждой строке.
 */

import { useMemo } from "react";
import { FileSpreadsheet, TrendingUp, Wallet } from "lucide-react";

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

export default function EsfPage() {
  const invoices = useApp((s) => s.db.invoices);
  const f = useRegistryFilter(invoices, (i) => [
    i.id,
    i.supplier,
    i.customer,
    i.product,
    i.supplierBin,
    i.customerBin,
  ]);

  const total = useMemo(
    () => invoices.reduce((sum, i) => sum + i.amount, 0),
    [invoices]
  );
  const overpriced = useMemo(
    () => invoices.filter((i) => i.avgPrice && i.price > i.avgPrice).length,
    [invoices]
  );

  return (
    <Screen
      title="Электронные счета-фактуры"
      subtitle="Реестр ЭСФ: контрагенты, товары, отклонение цены от рынка"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Счетов-фактур" value={num(invoices.length)} icon={FileSpreadsheet} />
        <KpiTile label="Общая сумма" value={money(total)} icon={Wallet} />
        <KpiTile
          label="Цена выше рынка"
          value={num(overpriced)}
          icon={TrendingUp}
          tone="danger"
        />
        <KpiTile
          label="С признаками риска"
          value={num(f.counts.risky)}
          icon={FileSpreadsheet}
          tone="warning"
        />
      </div>

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
    </Screen>
  );
}
