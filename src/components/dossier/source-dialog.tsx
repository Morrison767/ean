"use client";

/**
 * Запись источника — перенос окна и его правил из прежней версии.
 *
 * Ключевое: запись есть **у каждого** срабатывания. Базовая часть берётся из
 * справочника «флаг → тип данных, источник, назначение» (32 записи, лежали в
 * данных с самого начала), а отдельные флаги добавляют суммы, поля или
 * разделы. Поэтому кликается любое срабатывание, а не только те несколько, под
 * которые в данных есть подробности.
 *
 * Без этого окна флаг остаётся утверждением без доказательства: аналитик видит
 * «обнаружено», но не знает, какой реестр это сказал и когда.
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
import { cn } from "@/lib/utils";
import registry from "@/data/seed/assignments.json";
import type { Company, Person } from "@/data/types";

export interface SourceField {
  label: string;
  value: string;
  /** Моноширинные цифры: ИИН, БИН, номера дел и приказов. */
  mono?: boolean;
}

export interface SourceSection {
  title: string;
  /** Каждая запись — свой набор полей. */
  records: SourceField[][];
}

export interface SourceRecord {
  riskLabel: string;
  dataType: string;
  source: string;
  assignment: string;
  /** Когда сведения попали в систему. */
  ingestion: string;
  subjectId: string;
  amountsLabel?: string;
  amounts?: { total: number; principal: number; peni: number; shtraf: number };
  fields?: SourceField[];
  sections?: SourceSection[];
}

const REGISTRY = registry as Record<
  string,
  { dataType: string; source: string; assignment: string }
>;

/** Дата загрузки — фиксированная, как и в прежней версии. */
const INGESTION = "20.06.2026 03:14:22";

/** Справочная часть записи. Незнакомый флаг тоже получает источник. */
function base(flag: string, subjectId: string): SourceRecord {
  const meta = REGISTRY[flag] ?? {
    dataType: flag,
    source: "Государственные информационные системы РК",
    assignment: "Блок «Благонадёжность».",
  };
  return { riskLabel: flag, ...meta, ingestion: INGESTION, subjectId, fields: [] };
}

const firstName = (fullName: string) => fullName.split(" ")[0];

/** Запись источника для физлица. */
export function sourceForPerson(person: Person, flag: string): SourceRecord {
  const p = person as Person & Record<string, unknown>;
  const rec = base(flag, String(p.rka ?? person.iin));

  if (flag === "Налоговая задолженность") {
    return {
      ...rec,
      amounts: { total: 4_250_000, principal: 3_500_000, peni: 520_000, shtraf: 230_000 },
      fields: [
        { label: "Налогоплательщик (НП)", value: `ИП «${firstName(person.fullName)}»` },
        { label: "ИИН/БИН НП", value: person.iin, mono: true },
        { label: "Руководитель", value: person.fullName },
        { label: "ИИН руководителя", value: person.iin, mono: true },
        {
          label: "Вид деятельности (ОКЭД)",
          value: "62010 — Деятельность в области компьютерного программирования",
        },
        { label: "Регион", value: "г. Алматы" },
        { label: "Орган гос. доходов", value: "УГД по Медеускому району г. Алматы · код 6005" },
      ],
    };
  }

  if (flag === "Налоговая задолженность ИП" && p.ipTaxDebt) {
    return {
      ...rec,
      amounts: p.ipTaxDebt as SourceRecord["amounts"],
      fields: [
        { label: "Налогоплательщик (НП)", value: `ИП «${firstName(person.fullName)}»` },
        { label: "ИИН", value: person.iin, mono: true },
        { label: "Орган гос. доходов", value: "УГД · КГД МФ РК" },
      ],
    };
  }

  if (flag === "Наличие судимости" && p.criminalRecord) {
    const c = p.criminalRecord as Record<string, string>;
    return {
      ...rec,
      fields: [
        { label: "Квалификация / Статья", value: c.article },
        { label: "Вынесший суд", value: c.court },
        { label: "Мера наказания", value: c.punishment },
      ],
    };
  }

  if (flag === "Осуждён за рубежом" && p.foreignConviction) {
    const f = p.foreignConviction as Record<string, string>;
    return {
      ...rec,
      fields: [
        { label: "Страна", value: f.country },
        { label: "УК страны (статья)", value: f.article },
        { label: "Суд", value: f.court },
        { label: "Дата приговора", value: f.date },
        { label: "Наказание", value: f.punishment },
      ],
    };
  }

  if (flag === "Участие в судебных делах") {
    const cases = (person.courtCases ?? []) as unknown as Array<Record<string, string>>;
    const kindOf = (c: Record<string, string>) =>
      c.category ??
      (/уголов/i.test(c.kind) ? "criminal" : /граждан|иск/i.test(c.kind) ? "civil" : "admin");

    const sections: SourceSection[] = [
      {
        title: "Административные дела",
        records: cases
          .filter((c) => kindOf(c) === "admin")
          .map((c) => [
            { label: "Номер дела", value: c.number, mono: true },
            { label: "Суд / Орган", value: c.court ?? c.kind },
            { label: "Статус (решение)", value: c.status },
            { label: "Дата решения", value: c.date },
          ]),
      },
      {
        title: "Гражданские дела / иски",
        records: cases
          .filter((c) => kindOf(c) === "civil")
          .map((c) => [
            { label: "Номер дела", value: c.number, mono: true },
            { label: "Суд", value: c.court ?? "—" },
            { label: "Роль", value: c.role },
            { label: "Дата", value: c.date },
            { label: "Статус", value: c.status },
          ]),
      },
      {
        title: "Уголовные дела",
        records: cases
          .filter((c) => kindOf(c) === "criminal")
          .map((c) => [
            { label: "Номер уголовного дела", value: c.number, mono: true },
            { label: "Суд", value: c.court ?? "—" },
            { label: "Дата решения", value: c.date },
            { label: "Статус / Мера", value: c.punishment ?? c.status },
          ]),
      },
    ].filter((s) => s.records.length > 0);

    return { ...rec, sections };
  }

  if (flag === "Дисциплинарные взыскания" && Array.isArray(p.disciplinary)) {
    const list = p.disciplinary as Array<Record<string, string>>;
    if (list.length) {
      return {
        ...rec,
        sections: [
          {
            title: "Дисциплинарные взыскания",
            records: list.map((d) => [
              { label: "Место работы", value: d.workplace },
              { label: "Должность", value: d.position },
              { label: "Причина (квалификация)", value: d.qualification },
              { label: "Мера наказания", value: d.penalty },
              { label: "Дата наложения", value: d.date },
              { label: "Кто вынес взыскание", value: d.issuedBy },
            ]),
          },
        ],
      };
    }
  }

  if (flag === "Уволен по отрицательным мотивам" && p.dismissal) {
    const d = p.dismissal as Record<string, string>;
    return {
      ...rec,
      fields: [
        { label: "Место работы", value: d.workplace },
        { label: "Должность", value: d.position },
        { label: "Основание увольнения", value: d.grounds },
        { label: "Номер приказа", value: d.orderNumber, mono: true },
        { label: "Дата приказа", value: d.orderDate },
      ],
    };
  }

  return rec;
}

/** Запись источника для юрлица. */
export function sourceForCompany(company: Company, flag: string): SourceRecord {
  const c = company as Company & Record<string, unknown>;
  const rec = base(flag, company.bin);

  if (flag === "Налоговая задолженность") {
    const total = company.taxDebt || 4_250_000;
    return {
      ...rec,
      amounts: {
        total,
        principal: Math.round(total * 0.8),
        peni: Math.round(total * 0.14),
        shtraf: Math.round(total * 0.06),
      },
      fields: [
        { label: "Налогоплательщик (НП)", value: company.name },
        { label: "ИИН/БИН НП", value: company.bin, mono: true },
        { label: "Руководитель", value: company.manager?.name ?? "—" },
        { label: "ИИН руководителя", value: company.manager?.iin ?? "—", mono: true },
        {
          label: "Вид деятельности (ОКЭД)",
          value:
            company.activityType ??
            "62010 — Деятельность в области компьютерного программирования",
        },
        { label: "Регион", value: "г. Астана" },
        { label: "Орган гос. доходов", value: "УГД по району Есиль г. Астаны · код 6105" },
      ],
    };
  }

  if (flag === "Должник по исполнительным производствам" && c.enforcementDebt) {
    const d = c.enforcementDebt as Record<string, number>;
    return {
      ...rec,
      amountsLabel: "Задолженность по исполнительным производствам",
      amounts: {
        total: d.total,
        principal: d.principal,
        peni: d.penalties,
        shtraf: d.fine,
      },
      fields: [
        { label: "Должник", value: company.name },
        { label: "БИН", value: company.bin, mono: true },
        { label: "Орган исполнения", value: "Комитет по исполнению судебных актов ГП РК" },
      ],
    };
  }

  if (flag === "Судимость у первого руководителя" && c.execCriminalRecord) {
    const e = c.execCriminalRecord as Record<string, string>;
    return {
      ...rec,
      fields: [
        { label: "Руководитель", value: company.manager?.name ?? "—" },
        { label: "ИИН руководителя", value: company.manager?.iin ?? "—", mono: true },
        { label: "Квалификация / Статья", value: e.article },
        { label: "Мера наказания", value: e.punishment },
      ],
    };
  }

  if (flag === "Руководитель в розыске" && c.execWanted) {
    const e = c.execWanted as Record<string, string>;
    return {
      ...rec,
      fields: [
        { label: "Руководитель", value: company.manager?.name ?? "—" },
        { label: "ИИН руководителя", value: company.manager?.iin ?? "—", mono: true },
        { label: "Статья", value: e.article },
        { label: "Орган-инициатор розыска", value: e.initiator },
      ],
    };
  }

  return rec;
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
          <div className="flex flex-col gap-2.5 rounded-12 border border-border bg-surface p-3">
            <Line label="Тип данных" value={record.dataType} />
            <Line label="Источник" value={record.source} />
            <Line label="Назначение" value={record.assignment} />
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-2.5">
              <Line label="Загружено" value={record.ingestion} mono />
              <Line label="Идентификатор субъекта" value={record.subjectId} mono />
            </div>
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
            <div className="grid grid-cols-1 gap-2.5 rounded-12 border border-border bg-surface p-3 sm:grid-cols-2">
              {record.fields.map((f) => (
                <Line key={f.label} label={f.label} value={f.value} mono={f.mono} />
              ))}
            </div>
          )}

          {record.sections?.map((s) => (
            <div key={s.title} className="flex flex-col gap-2">
              <span className="text-overline uppercase text-muted-foreground">{s.title}</span>
              {s.records.map((fields, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2.5 rounded-12 border border-border bg-surface p-3 sm:grid-cols-2"
                >
                  {fields.map((f) => (
                    <Line key={f.label} label={f.label} value={f.value} mono={f.mono} />
                  ))}
                </div>
              ))}
            </div>
          ))}
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

function Line({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("break-words text-sm text-foreground", mono && "tabular-nums")}>
        {value || "—"}
      </span>
    </div>
  );
}
