"use client";

/**
 * Запись источника — окно из прежней версии.
 *
 * Открывается по срабатыванию в чек-листе благонадёжности: строка отвечает
 * «обнаружено», а окно показывает, на чём этот вывод основан. Без него флаг —
 * утверждение без доказательства, и проверять его приходится вне системы.
 *
 * Суммы задолженности разложены на основной долг, пеню и штраф — так они
 * приходят из источника и так показывались раньше.
 */

import { AlertTriangle, Database } from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { moneyFull } from "@/lib/format";
import type { Person } from "@/data/types";

export interface SourceRecord {
  /** Подпись срабатывания — она же заголовок риска в окне. */
  riskLabel: string;
  /** Откуда сведения. */
  source: string;
  amountsLabel?: string;
  amounts?: { total: number; principal: number; peni: number; shtraf: number };
  /** Прочие поля записи — показываются парами. */
  fields?: Array<{ label: string; value: string }>;
}

/**
 * Подбор записи источника под срабатывание чек-листа.
 *
 * Связь «флаг → объект с подробностями» в данных не описана, поэтому она
 * задана здесь явно: это единственное место, где о ней нужно знать.
 */
export function sourceFor(person: Person, flag: string): SourceRecord | null {
  const p = person as Person & Record<string, unknown>;

  if (/налог/i.test(flag) && p.ipTaxDebt) {
    const a = p.ipTaxDebt as SourceRecord["amounts"];
    return {
      riskLabel: flag,
      source: "ЕНС · Комитет государственных доходов МФ РК",
      amountsLabel: "Сумма задолженности",
      amounts: a,
    };
  }

  if (/судимост/i.test(flag) && p.criminalRecord) {
    const c = p.criminalRecord as Record<string, string>;
    return {
      riskLabel: flag,
      source: "Комитет по правовой статистике ГП РК",
      fields: [
        { label: "Статья", value: c.article },
        { label: "Суд", value: c.court },
        { label: "Наказание", value: c.punishment },
      ],
    };
  }

  if (/рубеж/i.test(flag) && p.foreignConviction) {
    const f = p.foreignConviction as Record<string, string>;
    return {
      riskLabel: flag,
      source: "Обмен данными по линии Интерпола",
      fields: [
        { label: "Страна", value: f.country },
        { label: "Статья", value: f.article },
        { label: "Суд", value: f.court },
        { label: "Дата", value: f.date },
        { label: "Наказание", value: f.punishment },
      ],
    };
  }

  if (/уволен/i.test(flag) && p.dismissal) {
    const d = p.dismissal as Record<string, string>;
    return {
      riskLabel: flag,
      source: "Кадровые сведения работодателя",
      fields: [
        { label: "Место работы", value: d.workplace },
        { label: "Должность", value: d.position },
        { label: "Основание", value: d.grounds },
        { label: "Приказ", value: `${d.orderNumber} от ${d.orderDate}` },
      ],
    };
  }

  if (/дисциплинар/i.test(flag) && Array.isArray(p.disciplinary)) {
    const list = p.disciplinary as Array<Record<string, string>>;
    return {
      riskLabel: flag,
      source: "Кадровые сведения работодателя",
      fields: list.map((d, i) => ({
        label: `Взыскание ${i + 1}`,
        value: Object.values(d).filter(Boolean).join(" · "),
      })),
    };
  }

  return null;
}

export function SourceDialog({
  record,
  onClose,
}: {
  record: SourceRecord | null;
  onClose: () => void;
}) {
  if (!record) return null;

  return (
    <Dialog open={!!record} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="gap-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 shrink-0 text-primary" />
            Источник данных
          </DialogTitle>
          <span className="flex items-center gap-1.5 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {record.riskLabel}
          </span>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          <div className="rounded-12 border border-border bg-surface p-3">
            <div className="text-xs text-muted-foreground">Источник</div>
            <div className="mt-0.5 text-sm text-foreground">{record.source}</div>
          </div>

          {record.amounts && (
            <div className="rounded-12 border border-danger/25 bg-danger-subtle p-3">
              <div className="text-overline uppercase text-muted-foreground">
                {record.amountsLabel ?? "Сумма задолженности"}
              </div>
              <div className="mt-1 text-2xl font-black tabular-nums text-danger">
                {moneyFull(record.amounts.total)}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { l: "Основной долг", v: record.amounts.principal },
                  { l: "Пеня", v: record.amounts.peni },
                  { l: "Штраф", v: record.amounts.shtraf },
                ].map((x) => (
                  <div key={x.l} className="min-w-0">
                    <div className="text-xs text-muted-foreground">{x.l}</div>
                    <div className="text-sm font-semibold tabular-nums text-foreground">
                      {moneyFull(x.v)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.fields && record.fields.length > 0 && (
            <div className="flex flex-col gap-2 rounded-12 border border-border bg-surface p-3">
              {record.fields.map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  <span className="text-sm text-foreground">{f.value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
