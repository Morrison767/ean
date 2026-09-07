"use client";

/**
 * Провал из профиля ЭСФ: все счета-фактуры по одному товару или по одному
 * партнёру.
 *
 * Оба экрана в прежней версии устроены одинаково — отличается только повод, по
 * которому отобраны строки, поэтому здесь один компонент с двумя режимами.
 * Колонки, фильтр направления и подпись пустого состояния перенесены как есть.
 *
 * Строка открывает карточку документа: провал — это ещё не конец пути, из него
 * идут дальше в конкретный счёт-фактуру.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Package } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { InvoiceDialog } from "@/components/modules/invoice-dialog";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { SegmentedControl } from "@/components/ui/tabs";
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
import { moneyFull, num, percent } from "@/lib/format";
import { companyCase } from "@/lib/utils";
import type { Invoice } from "@/data/types";

type Direction = "all" | "sales" | "purchases";

export function EsfDrilldown({
  bin,
  /** Название товара — режим «по ТРУ». */
  product,
  /** БИН партнёра — режим «по контрагенту». */
  partnerBin,
  invoices,
  onBack,
}: {
  bin: string;
  product?: string;
  partnerBin?: string;
  /** Все счета-фактуры субъекта. */
  invoices: Invoice[];
  onBack: () => void;
}) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>("all");
  const [opened, setOpened] = useState<Invoice | null>(null);

  const matched = useMemo(
    () =>
      invoices.filter((i) =>
        product
          ? i.product === product
          : i.supplierBin === partnerBin || i.customerBin === partnerBin
      ),
    [invoices, product, partnerBin]
  );

  const rows = useMemo(
    () =>
      matched.filter((i) =>
        direction === "all"
          ? true
          : direction === "sales"
            ? i.supplierBin === bin
            : i.customerBin === bin
      ),
    [matched, direction, bin]
  );

  const counts = {
    all: matched.length,
    sales: matched.filter((i) => i.supplierBin === bin).length,
    purchases: matched.filter((i) => i.customerBin === bin).length,
  };

  const total = rows.reduce((s, i) => s + i.amount, 0);

  /* Имя партнёра берём из первой же строки: отдельного справочника нет. */
  const partnerName = partnerBin
    ? (() => {
        const first = matched[0];
        if (!first) return partnerBin;
        return first.supplierBin === partnerBin ? first.supplier : first.customer;
      })()
    : undefined;

  return (
    <Screen className="max-w-[1500px]">
      <InvoiceDialog
        invoice={opened}
        onClose={() => setOpened(null)}
        onCounterparty={(b) => {
          setOpened(null);
          router.push(`/esf/${b}`);
        }}
      />

      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к профилю
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-12 bg-accent text-primary">
          {product ? (
            <Package className="h-6 w-6" strokeWidth={1.8} />
          ) : (
            <Building2 className="h-6 w-6" strokeWidth={1.8} />
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
            {product ?? companyCase(partnerName ?? "")}
          </h1>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {partnerBin && <span className="tabular-nums">БИН {partnerBin}</span>}
            <span>
              {num(rows.length)} ЭСФ · {moneyFull(total)}
            </span>
          </span>
        </div>
      </div>

      <SegmentedControl
        value={direction}
        onChange={(v) => setDirection(v as Direction)}
        items={[
          { id: "all", label: "Все", count: counts.all },
          { id: "sales", label: "Реализация", count: counts.sales },
          { id: "purchases", label: "Приобретения", count: counts.purchases },
        ]}
      />

      <SectionCard
        icon={product ? Package : Building2}
        title={product ? "Счета-фактуры по позиции" : "Счета-фактуры с контрагентом"}
        collapsible={false}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ЭСФ и дата</TableHead>
                <TableHead>Связь (кто кому)</TableHead>
                <TableHead>Товар / услуга</TableHead>
                <TableHead numeric>Сумма</TableHead>
                <TableHead numeric>Отклонение</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>Нет ЭСФ по выбранному фильтру</TableEmpty>
              ) : (
                rows.map((i) => {
                  const delta =
                    i.avgPrice && i.avgPrice > 0
                      ? ((i.price - i.avgPrice) / i.avgPrice) * 100
                      : null;
                  return (
                    <TableRow key={i.id} interactive onClick={() => setOpened(i)}>
                      <TableCell>
                        <span className="flex flex-col">
                          <span className="tabular-nums font-medium text-foreground">{i.id}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {i.date}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {companyCase(i.supplier)} → {companyCase(i.customer)}
                      </TableCell>
                      <TableCell>{i.product}</TableCell>
                      <TableCell numeric>{moneyFull(i.amount)}</TableCell>
                      <TableCell numeric>
                        {delta == null ? (
                          <span className="text-faint">—</span>
                        ) : (
                          <Badge
                            tone={delta > 15 ? "danger" : delta > 0 ? "warning" : "success"}
                            size="sm"
                          >
                            {delta > 0 ? "+" : ""}
                            {percent(delta)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {i.status && (
                            <Badge tone="outline" size="sm">
                              {i.status}
                            </Badge>
                          )}
                          <RiskBadge level={i.risk} size="sm" />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Screen>
  );
}
