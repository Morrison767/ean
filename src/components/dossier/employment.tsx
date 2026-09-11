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
  Briefcase,
  CalendarClock,
  Database,
  FileText,
  Landmark,
  ShieldAlert,
  TimerReset,
} from "lucide-react";

import { Findings } from "@/components/dossier/findings";
import { CompanyLink } from "@/components/dossier/subject-link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
import { employmentRisks, recordKey, type EmploymentRisk } from "@/lib/employment-risks";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/use-app";
import type { Employment, Person } from "@/data/types";

export function EmploymentTab({ person }: { person: Person }) {
  const db = useApp((s) => s.db);
  const summary = summarize(person.employment);
  const risks = employmentRisks(person, db);
  const flagged = new Set(risks.flatMap((r) => r.records));

  if (summary.records.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Записей о трудовой деятельности нет"
        description={`В ЕСУТД (enbek.kz) на ${AS_OF} нет трудовых договоров по этому ИИН.`}
      />
    );
  }

  return (
    <Stagger>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile
          label="Признаков риска"
          value={String(risks.length)}
          icon={ShieldAlert}
          tone={risks.some((r) => r.severity === "high") ? "danger" : risks.length ? "warning" : "brand"}
        />
        <KpiTile
          label="Действующих договоров"
          value={String(summary.active.length)}
          icon={FileText}
          tone={summary.active.length > 1 ? "warning" : "brand"}
        />
        <KpiTile label="Общий стаж" value={humanMonths(summary.totalMonths)} icon={TimerReset} />
      </div>

      <Findings
        findings={risks}
        title="Риски по трудовой биографии"
        subtitle="Связки с закупками, госорганами и реестром юрлиц"
        emptyText="Связок с закупками, госорганами и проблемными юрлицами по трудовой биографии не найдено."
      />

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
              key={recordKey(record)}
              record={record}
              flagged={flagged.has(recordKey(record))}
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
          Источник: Электронная биржа труда Enbek.kz (ЕСУТД), госреестр ИП и ГБД ЮЛ. Выгрузка
          на {AS_OF} — открытые договоры посчитаны к этой дате, а не к сегодняшней. Участие в
          организации без должности показано для полноты картины, но в стаж не входит.
        </span>
      </p>
    </Stagger>
  );
}

function Row({
  record,
  gap,
  last,
  flagged,
}: {
  record: Employment;
  gap?: { months: number };
  last: boolean;
  /** Запись попала хотя бы в одну находку — помечаем прямо в ленте. */
  flagged: boolean;
}) {
  const open = !record.end;
  const months = durationOf(record);
  const participation = record.kind === "participation";
  /* ИП — не отдельное юрлицо, досье у него нет. А БИН у него совпадает с ИИН
     владельца и в этих фикстурах местами равен БИН его же ТОО, так что ссылка
     увела бы в чужую карточку. Поэтому связываем только организации. */
  const linkable = record.kind === "contract";
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
            flagged
            ? "border-danger bg-danger"
            : participation
              ? "border-hue-violet bg-card"
              : open
                ? "border-success bg-success"
                : "border-border-strong bg-card"
          )}
        />
        {!last && <span className="mt-1 w-px flex-1 bg-border" />}
      </span>

      {/* Запись, попавшая в находку, помечена и в ленте: иначе список рисков
          сверху и хронология внизу живут порознь, и приходится сопоставлять
          названия глазами. */}
      <div
        className={cn(
          "min-w-0 flex-1 pb-5 pt-3",
          flagged && "-ml-2 border-l-2 border-danger/40 pl-3"
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-foreground">
            {/* У записи участия должности нет — заголовком служит сама роль
                владения, иначе «Учредитель» повторяется дважды подряд. */}
            {participation ? (record.ownership ?? record.position) : record.position}
          </span>
          {open && !participation && (
            <Badge tone="success" size="sm">
              Действует
            </Badge>
          )}
          {record.kind === "entrepreneur" && (
            <Badge tone="indigo" size="sm">
              ИП
            </Badge>
          )}
          {participation && (
            <Badge tone="violet" size="sm">
              Участие, без должности
            </Badge>
          )}
          {record.status && (
            <Badge tone="outline" size="sm">
              {record.status}
            </Badge>
          )}
        </div>

        <p className="mt-0.5 text-sm text-muted-foreground">
          {linkable ? (
            <CompanyLink name={record.company} bin={record.bin} />
          ) : (
            record.company
          )}
        </p>

        {/* Роль владения из ГБД ЮЛ — рядом с должностью, а не в другой вкладке:
            «ведущий специалист» и «учредитель 20 %» это об одной организации. */}
        {record.ownership && !participation && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-hue-violet">
            <Landmark className="h-3.5 w-3.5 shrink-0" />
            {record.ownership}
          </p>
        )}

        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {record.start} — {record.end ?? "по настоящее время"}
          <span className="text-faint">
            {" · "}
            {humanMonths(months)}
            {participation && " · в стаж не входит"}
          </span>
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
