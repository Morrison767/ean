"use client";

/**
 * Реестр внешнеэкономической деятельности.
 *
 * Кроме фильтра по риску здесь нужен фильтр по направлению: импорт и экспорт
 * анализируют раздельно, и смешанный список приходилось бы разбирать глазами.
 */

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Globe, Package } from "lucide-react";

import { Screen } from "@/components/app/screen";
import {
  RegistryTable,
  RegistryToolbar,
  useRegistryFilter,
} from "@/components/modules/registry";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { KpiTile } from "@/components/ui/kpi-tile";
import { SegmentedControl } from "@/components/ui/tabs";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { num, usd } from "@/lib/format";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";

type Direction = "all" | "import" | "export";

export default function VedPage() {
  const declarations = useApp((s) => s.db.declarations);
  const [dir, setDir] = useState<Direction>("all");

  const byDirection = useMemo(
    () => (dir === "all" ? declarations : declarations.filter((d) => d.type === dir)),
    [declarations, dir]
  );

  const f = useRegistryFilter(byDirection, (d) => [
    d.id,
    d.company,
    d.partner,
    d.product,
    d.hsCode,
    d.bin,
    d.countryCode,
  ]);

  const totals = useMemo(
    () => ({
      import: declarations.filter((d) => d.type === "import").reduce((s, d) => s + d.valueUsd, 0),
      export: declarations.filter((d) => d.type === "export").reduce((s, d) => s + d.valueUsd, 0),
      importCount: declarations.filter((d) => d.type === "import").length,
      exportCount: declarations.filter((d) => d.type === "export").length,
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
        <KpiTile
          label="С признаками риска"
          value={num(declarations.filter((d) => d.risk !== "none").length)}
          icon={Package}
          tone="danger"
        />
      </div>

      <SegmentedControl
        value={dir}
        onChange={(v) => setDir(v as Direction)}
        items={[
          { id: "all", label: "Все направления", count: declarations.length },
          { id: "import", label: "Импорт", count: totals.importCount },
          { id: "export", label: "Экспорт", count: totals.exportCount },
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
            <TableCell className="tabular-nums">{d.countryCode}</TableCell>
            <TableCell>{d.product}</TableCell>
            <TableCell className="tabular-nums">{d.hsCode}</TableCell>
            <TableCell numeric>{usd(d.valueUsd)}</TableCell>
            <TableCell>
              <RiskBadge level={d.risk} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      />
    </Screen>
  );
}
