"use client";

/**
 * Карточка счёта-фактуры — перенос окна из прежней версии.
 *
 * Состав: шапка с номером, датой и источником, статус и риск, кнопка выгрузки;
 * две стороны сделки; спецификация ТРУ и итог; отдельный блок отклонения цены
 * от рынка — ради него окно обычно и открывают.
 *
 * Из окна можно уйти к контрагенту: в прежней версии это был единственный
 * способ перейти от документа к организации, не теряя список.
 */

import { AlertTriangle, ArrowRight, Building2, Download, FileSpreadsheet } from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from "@/components/ui/table";
import { moneyFull, num, percent } from "@/lib/format";
import { cn, companyCase } from "@/lib/utils";
import type { Invoice } from "@/data/types";

export function InvoiceDialog({
  invoice,
  onClose,
  onCounterparty,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  /** Переход к контрагенту по БИН — окно при этом закрывается. */
  onCounterparty?: (bin: string) => void;
}) {
  if (!invoice) return null;

  const deviation =
    invoice.avgPrice && invoice.avgPrice > 0
      ? ((invoice.price - invoice.avgPrice) / invoice.avgPrice) * 100
      : null;

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="gap-2">
          <span className="text-overline uppercase text-muted-foreground">
            Электронный счёт-фактура
          </span>
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-xl font-bold tabular-nums text-foreground">
              {invoice.id}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            Дата выписки: {invoice.date}
            {invoice.source && ` · Источник: ${invoice.source}`}
          </span>
          <span className="flex flex-wrap items-center gap-2 pt-1">
            {invoice.status && (
              <Badge tone="outline" size="sm">
                {invoice.status}
              </Badge>
            )}
            <RiskBadge level={invoice.risk} size="sm" />
          </span>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          {/* Стороны сделки */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Party
              role="Поставщик"
              name={invoice.supplier}
              bin={invoice.supplierBin}
              onOpen={onCounterparty}
            />
            <Party
              role="Покупатель"
              name={invoice.customer}
              bin={invoice.customerBin}
              onOpen={onCounterparty}
            />
          </div>

          {/* Спецификация */}
          <div className="flex flex-col gap-2">
            <span className="text-overline uppercase text-muted-foreground">
              Спецификация (ТРУ)
            </span>
            <div className="overflow-hidden rounded-12 border border-border">
              <TableWrap>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Наименование</TableHead>
                      <TableHead numeric>Кол-во</TableHead>
                      <TableHead numeric>Цена за ед.</TableHead>
                      <TableHead numeric>Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{invoice.product}</TableCell>
                      <TableCell numeric>
                        {num(invoice.qty)}
                        {invoice.unit ? ` ${invoice.unit}` : ""}
                      </TableCell>
                      <TableCell numeric>{moneyFull(invoice.price)}</TableCell>
                      <TableCell numeric>{moneyFull(invoice.amount)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableWrap>
              <div className="flex items-center justify-between border-t border-border bg-surface px-3 py-2.5">
                <span className="text-sm font-semibold text-foreground">Итого</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {moneyFull(invoice.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Отклонение от рынка — ради него окно и открывают */}
          <div className="flex flex-col gap-2">
            <span className="text-overline uppercase text-muted-foreground">
              Отклонение от рынка
            </span>
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-12 border px-3 py-3",
                deviation != null && deviation > 15
                  ? "border-danger/40 bg-danger-subtle"
                  : "border-border bg-surface"
              )}
            >
              <span className="flex items-center gap-2 text-sm">
                {deviation != null && deviation > 15 && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-icon-danger" />
                )}
                <span className="text-muted-foreground">Цена</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {moneyFull(invoice.price)}
                </span>
                {invoice.avgPrice ? (
                  <>
                    <span className="text-muted-foreground">· среднерыночная</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {moneyFull(invoice.avgPrice)}
                    </span>
                  </>
                ) : null}
              </span>
              {deviation == null ? (
                <span className="text-sm text-muted-foreground">нет данных о рынке</span>
              ) : deviation > 0 ? (
                <Badge tone={deviation > 15 ? "danger" : "warning"} size="lg">
                  +{percent(deviation)}
                </Badge>
              ) : (
                <Badge tone="success" size="lg">
                  в норме
                </Badge>
              )}
            </div>
          </div>

          {invoice.importExport && (
            <p className="text-xs text-muted-foreground">{invoice.importExport}</p>
          )}
          {invoice.bank && <p className="text-xs text-muted-foreground">{invoice.bank}</p>}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" icon={Download}>
            Скачать
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Party({
  role,
  name,
  bin,
  onOpen,
}: {
  role: string;
  name: string;
  bin: string;
  onOpen?: (bin: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-12 border border-border bg-surface p-3">
      <span className="text-overline uppercase text-muted-foreground">{role}</span>
      <span className="flex items-start gap-2">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-icon-secondary" />
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          {companyCase(name)}
        </span>
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">БИН: {bin}</span>
      {onOpen && (
        <button
          type="button"
          onClick={() => onOpen(bin)}
          className="mt-1 flex w-fit items-center gap-1 text-xs font-semibold text-link transition-colors hover:text-link-hover"
        >
          К контрагенту
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
