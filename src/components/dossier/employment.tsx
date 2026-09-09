"use client";

/**
 * Трудовая деятельность физлица.
 *
 * Показываем лентой, а не таблицей: в биографии значим порядок и
 * непрерывность, а таблица уравнивает строки и прячет главное — что между
 * двумя записями год без работы, а две другие действовали одновременно.
 * Разрывы и наложения поэтому нарисованы прямо в ленте, а не спрятаны в
 * колонку, которую надо сверять глазами.
 *
 * Сведения приходят из ЕСУТД (enbek.kz); самозанятость — из госреестра ИП,
 * и у каждой записи подписано, откуда она.
 */

import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarClock,
  Database,
  FileText,
  Layers,
  TimerReset,
} from "lucide-react";

import { CompanyLink } from "@/components/dossier/subject-link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Insight } from "@/components/ui/insight";
import { KpiTile } from "@/components/ui/kpi-tile";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { counted } from "@/lib/format";
import {
  AS_OF,
  durationOf,
  formatDate,
  humanMonths,
  summarize,
} from "@/lib/employment";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/use-app";
import type { Employment, Person } from "@/data/types";

export function EmploymentTab({ person }: { person: Person }) {
  const companies = useApp((s) => s.db.companies);
  const summary = summarize(person.employment);

  if (summary.records.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Записей о трудовой деятельности нет"
        description={`В ЕСУТД (enbek.kz) на ${AS_OF} нет трудовых договоров по этому ИИН.`}
      />
    );
  }

  /* Работодатель, который сам есть в базе с признаками риска, — это не просто
     строка биографии, а пересечение субъекта с проверяемой организацией. */
  const riskyEmployers = summary.records
    .map((r) => companies.find((c) => (r.bin && c.bin === r.bin) || c.name === r.company))
    .filter((c): c is NonNullable<typeof c> => !!c && c.riskLevel !== "none");
  const uniqueRisky = [...new Map(riskyEmployers.map((c) => [c.bin, c])).values()];

  /*
    В ленте отмечаем любой разрыв: это факт, и он должен быть виден. А в выводы
    выносим только заметный — два месяца между работами это обычное дело, и
    карточка о нём приучает пропускать такие карточки вообще.
  */
  const longestGap = [...summary.gaps]
    .filter((g) => g.months >= 3)
    .sort((a, b) => b.months - a.months)[0];

  return (
    <Stagger>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Общий стаж" value={humanMonths(summary.totalMonths)} icon={TimerReset} />
        <KpiTile label="Работодателей" value={String(summary.employers)} icon={Building2} />
        <KpiTile
          label="Действующих договоров"
          value={String(summary.active.length)}
          icon={FileText}
          tone={summary.active.length > 1 ? "warning" : "brand"}
        />
        <KpiTile
          label="Дольше всего"
          value={summary.longest ? humanMonths(summary.longest.months) : "—"}
          icon={Briefcase}
        />
      </div>

      {(summary.idle || summary.overlaps.length > 0 || longestGap || uniqueRisky.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-3">
          {summary.idle && (
            <Insight
              icon={CalendarClock}
              tone={summary.idle.months >= 6 ? "danger" : "warning"}
              title="Сейчас нигде не трудоустроен"
              value={humanMonths(summary.idle.months)}
              detail={`последний договор прекращён ${formatDate(summary.idle.since)}`}
            />
          )}
          {summary.overlaps.length > 0 && (
            <Insight
              icon={Layers}
              tone="warning"
              title="Одновременные договоры"
              value={counted(summary.overlaps.length, "пара", "пары", "пар")}
              detail={`${summary.overlaps[0][0].company} и ${summary.overlaps[0][1].company} — периоды пересекаются`}
            />
          )}
          {longestGap && (
            <Insight
              icon={CalendarClock}
              tone={longestGap.months >= 12 ? "warning" : "neutral"}
              title="Наибольший перерыв"
              value={humanMonths(longestGap.months)}
              detail={`с ${formatDate(longestGap.from)} по ${formatDate(longestGap.to)} записей нет`}
            />
          )}
          {uniqueRisky.length > 0 && (
            <Insight
              icon={AlertTriangle}
              tone="danger"
              title="Работодатели с признаками риска"
              value={String(uniqueRisky.length)}
              detail={uniqueRisky.map((c) => c.name).join(", ")}
            />
          )}
        </div>
      )}

      <SectionCard
        icon={Briefcase}
        title="История трудовой деятельности"
        subtitle={`${counted(summary.records.length, "запись", "записи", "записей")} · с ${
          summary.first ? formatDate(summary.first) : "—"
        }`}
        collapsible={false}
      >
        <ol className="flex flex-col px-4 py-2 sm:px-5">
          {summary.records.map((record, i) => (
            <Row
              key={`${record.contract ?? record.company}-${record.start}`}
              record={record}
              /* Разрыв стоит перед записью, если он упирается в её начало. */
              gap={summary.gaps.find((g) => formatDate(g.to) === record.start)}
              last={i === summary.records.length - 1}
            />
          ))}
        </ol>
      </SectionCard>

      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Источник: Электронная биржа труда Enbek.kz (ЕСУТД) и госреестр ИП. Выгрузка на {AS_OF}.
          Открытые договоры посчитаны к этой дате, а не к сегодняшней.
        </span>
      </p>
    </Stagger>
  );
}

function Row({
  record,
  gap,
  last,
}: {
  record: Employment;
  gap?: { months: number };
  last: boolean;
}) {
  const open = !record.end;
  const months = durationOf(record);
  const details: Array<[string, string | undefined]> = [
    ["Договор", record.contract],
    ["Код НКЗ", record.nkz],
    ["Вид договора", record.contractType],
    ["Режим работы", record.schedule],
    ["Регион", record.region],
    ["Вид деятельности", record.activity],
  ];

  return (
    <li className="flex gap-3">
      {/* Рельс: точка записи и линия до следующей. Действующий договор
          выделен заливкой, завершённый — только контуром: так видно, где
          биография продолжается, а где закрыта. */}
      <span className="flex w-3.5 shrink-0 flex-col items-center pt-[18px]">
        <span
          className={cn(
            "h-3 w-3 shrink-0 rounded-full border-2",
            open ? "border-success bg-success" : "border-border-strong bg-card"
          )}
        />
        {!last && <span className="mt-1 w-px flex-1 bg-border" />}
      </span>

      <div className="min-w-0 flex-1 pb-5 pt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-foreground">{record.position}</span>
          {open && (
            <Badge tone="success" size="sm">
              Действует
            </Badge>
          )}
          {record.contractType === "Индивидуальное предпринимательство" && (
            <Badge tone="indigo" size="sm">
              ИП
            </Badge>
          )}
        </div>

        <p className="mt-0.5 text-sm text-muted-foreground">
          <CompanyLink name={record.company} bin={record.bin} />
        </p>

        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {record.start} — {record.end ?? "по настоящее время"}
          <span className="text-faint"> · {humanMonths(months)}</span>
        </p>

        <dl className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {details
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col">
                <dt className="text-xs text-faint">{label}</dt>
                <dd className="break-words text-xs text-foreground">{value}</dd>
              </div>
            ))}
        </dl>

        {record.dismissal && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="text-faint">Основание прекращения: </span>
            {record.dismissal}
          </p>
        )}

        {record.source && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-faint">
            <Database className="h-3 w-3 shrink-0" />
            {record.source}
          </p>
        )}

        {gap && (
          <p className="mt-4 flex items-center gap-2 rounded-10 border border-dashed border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-icon-secondary" />
            Перерыв {humanMonths(gap.months)} — действующих договоров нет
          </p>
        )}
      </div>
    </li>
  );
}
