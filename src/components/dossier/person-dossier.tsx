"use client";

/**
 * Досье физического лица.
 *
 * Слева — постоянная карточка субъекта: она не меняется при переключении
 * вкладок, потому что отвечает на вопрос «кто это», а вкладки — на вопрос «что
 * про него известно». Справа семь разделов, порядок от вывода к подробностям:
 * сначала благонадёжность, в конце перемещения.
 *
 * Вкладка живёт в адресе (?tab=…): ссылку на раздел досье можно переслать.
 */

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Briefcase,
  Building2,
  Download,
  GraduationCap,
  Landmark,
  Mail,
  MessageCircle,
  Network,
  Phone,
  Plane,
  ShieldCheck,
  ShoppingCart,
  ExternalLink,
  Sparkles,
  Train,
  User,
  Users,
  Wallet,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { Checklist } from "@/components/dossier/checklist";
import { DataList, Field } from "@/components/dossier/data-list";
import { DocumentsTabs } from "@/components/dossier/documents-tabs";
import { ScoreMeter } from "@/components/dossier/score-meter";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { UnderlineTabs } from "@/components/ui/tabs";
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
import { RISK_TAG_LABEL } from "@/config/dashboard";
import { money, moneyFull, num, percent } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { cn, companyCase } from "@/lib/utils";
import type { ChecklistSection, Person, RiskLevel } from "@/data/types";

const TABS = [
  { id: "trust", label: "Благонадёжность", icon: ShieldCheck },
  { id: "personal", label: "Личные данные", icon: User },
  { id: "assets", label: "Бизнес и активы", icon: Wallet },
  { id: "procurement", label: "Госзакупки", icon: ShoppingCart },
  { id: "finance", label: "Финмониторинг", icon: Landmark },
  { id: "links", label: "Связи", icon: Network },
  { id: "travel", label: "Перемещения", icon: Plane },
];

/** Значение риска из фикстуры может прийти строкой вне перечисления. */
const asRisk = (v: unknown): RiskLevel =>
  (["none", "medium", "high"] as const).includes(v as RiskLevel)
    ? (v as RiskLevel)
    : "none";

export function PersonDossier({
  person,
  checklist,
}: {
  person: Person;
  checklist: ChecklistSection[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();

  const tab = params.get("tab") ?? "trust";
  const setTab = (id: string) =>
    router.replace(`/person/${person.id}?tab=${id}`, { scroll: false });

  const initials = useMemo(
    () =>
      person.fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join(""),
    [person.fullName]
  );

  return (
    <Screen className="max-w-[1500px]">
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* --------------------------- левая карточка --------------------------- */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-accent text-xl font-bold text-primary">
                {initials}
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-h4 font-semibold leading-tight text-foreground">
                  {person.fullName}
                </h1>
                <p className="text-xs tabular-nums text-muted-foreground">
                  ИИН {person.iin}
                </p>
              </div>
            </div>

            <ScoreMeter score={person.score} level={person.riskLevel} />

            {person.riskTags && person.riskTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {person.riskTags.map((t) => (
                  <Badge key={t} tone="danger" size="sm">
                    {RISK_TAG_LABEL[t] ?? t}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {person.phone && <Contact icon={Phone} value={person.phone} />}
              {person.email && <Contact icon={Mail} value={person.email} />}
              {person.telegram?.map((t) => (
                <Contact key={t} icon={MessageCircle} value={t} />
              ))}
            </div>

            <DataList cols={2} className="border-t border-border pt-4">
              <Field label="Дата рождения" value={person.dob} mono />
              <Field label="Пол" value={person.gender} />
              <Field label="Гражданство" value={person.citizenship} />
              <Field label="Статус" value={person.lifeStatus} />
              <Field label="Семейное положение" value={person.maritalStatus} span={2} />
            </DataList>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button icon={Sparkles}>Портрет AI</Button>
              <Button variant="secondary" icon={Download}>
                Скачать досье
              </Button>
            </div>
          </div>
        </aside>

        {/* ----------------------------- вкладки ----------------------------- */}
        <div className="flex min-w-0 flex-col gap-5">
          <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

          {/*
            Смена вкладки — короткое проявление на месте. mode="wait" здесь не
            нужен: разделы не пересекаются во времени, а ожидание выхода
            задержало бы появление нового на 200 мс.
          */}
          <AnimatePresence initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: reduce ? 0 : motionTokens.distance.sm }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduce ? 0.12 : motionTokens.duration.normal,
                ease: motionTokens.easing.smooth,
              }}
              className="flex flex-col gap-4"
            >
              {tab === "trust" && (
                <Checklist
                  sections={checklist}
                  flags={person.trustFlags ?? []}
                  checks={(person.trustChecks ?? []).filter(
                    (c): c is string => typeof c === "string"
                  )}
                />
              )}
              {tab === "personal" && <PersonalTab person={person} />}
              {tab === "assets" && <AssetsTab person={person} />}
              {tab === "procurement" && <ProcurementTab person={person} />}
              {tab === "finance" && <FinanceTab person={person} />}
              {tab === "links" && <LinksTab person={person} />}
              {tab === "travel" && <TravelTab person={person} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Screen>
  );
}

function Contact({
  icon: Icon,
  value,
}: {
  icon: typeof Phone;
  value: string;
}) {
  return (
    <span className="flex items-center gap-2 text-sm text-foreground">
      <Icon className="h-4 w-4 shrink-0 text-icon-secondary" />
      <span className="truncate">{value}</span>
    </span>
  );
}

/* ------------------------------- Личные данные ------------------------------- */

function PersonalTab({ person }: { person: Person }) {
  return (
    <Stagger>
      <SectionCard icon={User} title="Основные сведения" collapsible={false}>
        <DataList cols={3} className="p-4 sm:p-5">
          <Field label="Место рождения" value={person.birthPlace} span={2} />
          <Field label="Национальность" value={person.nationality} />
          <Field label="РКА" value={person.rka} mono />
          <Field label="Дата регистрации" value={person.regDate} />
          <Field label="Стаж" value={person.experience} />
          <Field label="Супруг(а)" value={person.spouseName} span={2} />
        </DataList>
      </SectionCard>

      {person.documents && person.documents.length > 0 && (
        <SectionCard icon={ShieldCheck} title="Документы" collapsible={false}>
          <DocumentsTabs documents={person.documents} />
        </SectionCard>
      )}

      {person.addresses && person.addresses.length > 0 && (
        <SectionCard icon={Building2} title="Адреса" collapsible={false}>
          <ul className="flex flex-col">
            {person.addresses.map((a, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 last:border-0 sm:px-5"
              >
                <span className="text-sm text-foreground">{a.address}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone="outline" size="sm">
                    {a.type}
                  </Badge>
                  {a.period}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {person.education && person.education.length > 0 && (
        <SectionCard icon={GraduationCap} title="Образование" collapsible={false}>
          <ul className="flex flex-col">
            {person.education.map((e, i) => (
              <li key={i} className="border-b border-border px-4 py-3 last:border-0 sm:px-5">
                <p className="text-sm font-medium text-foreground">{e.institution}</p>
                <p className="text-xs text-muted-foreground">
                  {[e.faculty, e.degree, e.city].filter(Boolean).join(" · ")}
                  {e.start && ` · ${e.start}—${e.end ?? "н. в."}`}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {person.relatives && person.relatives.length > 0 && (
        <SectionCard
          icon={Users}
          title="Родственники"
          subtitle={`${person.relatives.length} записей`}
          collapsible={false}
        >
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Родство</TableHead>
                  <TableHead>ФИО</TableHead>
                  <TableHead>ИИН</TableHead>
                  <TableHead>Телефон</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {person.relatives.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{r.relation}</TableCell>
                    <TableCell className="font-medium">{r.fullName}</TableCell>
                    <TableCell className="tabular-nums">{r.iin}</TableCell>
                    <TableCell className="tabular-nums">{r.phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}
    </Stagger>
  );
}

/* ------------------------------ Бизнес и активы ------------------------------ */

function AssetsTab({ person }: { person: Person }) {
  const businesses = person.businesses ?? [];

  return (
    <Stagger>
      <SectionCard
        icon={Briefcase}
        title="Участие в компаниях"
        subtitle={`${businesses.length} организаций`}
        collapsible={false}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Организация</TableHead>
                <TableHead>БИН</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead numeric>Доля</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.length === 0 ? (
                <TableEmpty colSpan={6}>Участие в компаниях не найдено</TableEmpty>
              ) : (
                businesses.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {companyCase(String(b.name ?? ""))}
                    </TableCell>
                    <TableCell className="tabular-nums">{String(b.bin ?? "")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {String(b.role ?? "")}
                    </TableCell>
                    <TableCell numeric>{String(b.share ?? "—")}</TableCell>
                    <TableCell>{String(b.status ?? "")}</TableCell>
                    <TableCell>
                      <RiskBadge level={asRisk(b.risk)} size="sm" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>

      {person.realEstate && person.realEstate.length > 0 && (
        <SectionCard icon={Building2} title="Недвижимость" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead>Кадастровый номер</TableHead>
                  <TableHead numeric>Доля</TableHead>
                  <TableHead>Обременение</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {person.realEstate.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.type}</TableCell>
                    <TableCell>{r.address}</TableCell>
                    <TableCell className="tabular-nums">{r.cadastral}</TableCell>
                    <TableCell numeric>{r.share}</TableCell>
                    <TableCell>
                      {r.encumbrance ? (
                        <Badge tone="danger" size="sm">
                          {r.encumbrance}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">нет</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}

      {person.vehicles && person.vehicles.length > 0 && (
        <SectionCard icon={Wallet} title="Транспорт" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Модель</TableHead>
                  <TableHead>Гос. номер</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead numeric>Год</TableHead>
                  <TableHead>Обременение</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {person.vehicles.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{v.model}</TableCell>
                    <TableCell className="tabular-nums">{v.plate}</TableCell>
                    <TableCell className="tabular-nums">{v.vin}</TableCell>
                    <TableCell numeric>{v.year}</TableCell>
                    <TableCell>
                      {v.encumbrance ? (
                        <Badge tone="danger" size="sm">
                          {v.encumbrance}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">нет</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}

      {person.income && person.income.length > 0 && (
        <SectionCard icon={Wallet} title="Доходы" collapsible={false}>
          <DataList cols={3} className="p-4 sm:p-5">
            {person.income.map((y, i) => (
              <Field
                key={i}
                label={`${y.year} · ${y.source ?? "источник не указан"}`}
                value={moneyFull(y.amount)}
                mono
              />
            ))}
          </DataList>
        </SectionCard>
      )}
    </Stagger>
  );
}

/* -------------------------------- Госзакупки -------------------------------- */

function ProcurementTab({ person }: { person: Person }) {
  const p = person.procurement as
    | {
        role?: string;
        since?: string;
        contracts?: number;
        totalAmount?: number;
        winRate?: number;
        flags?: string[];
        registries?: Array<{ label: string; status: string }>;
        items?: Array<Record<string, unknown>>;
      }
    | undefined;

  if (!p) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Участие в госзакупках не найдено"
        description="Субъект не значится ни поставщиком, ни заказчиком."
      />
    );
  }

  return (
    <Stagger>
      <SectionCard
        icon={ShoppingCart}
        title="Участие в госзакупках"
        collapsible={false}
        action={<OpenInModule href={`/procurement?focus=${encodeURIComponent(person.fullName)}`} module="Закупки" />}
      >
        <DataList cols={4} className="p-4 sm:p-5">
          <Field label="Роль" value={p.role} />
          <Field label="Участвует с" value={p.since} mono />
          <Field label="Контрактов" value={p.contracts != null ? num(p.contracts) : "—"} mono />
          <Field
            label="Сумма контрактов"
            value={p.totalAmount != null ? money(p.totalAmount) : "—"}
            mono
            accent
          />
          <Field
            label="Доля побед"
            value={p.winRate != null ? percent(p.winRate) : "—"}
            mono
          />
        </DataList>
      </SectionCard>

      {p.flags && p.flags.length > 0 && (
        <SectionCard icon={ShieldCheck} title="Признаки риска" collapsible={false}>
          <ul className="flex flex-col">
            {p.flags.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm text-foreground last:border-0 sm:px-5"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                {f}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {p.items && p.items.length > 0 && (
        <SectionCard icon={ShoppingCart} title="Контракты" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заказчик</TableHead>
                  <TableHead>Предмет</TableHead>
                  <TableHead numeric>Сумма</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Риск</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {companyCase(String(it.customer ?? ""))}
                    </TableCell>
                    <TableCell>{String(it.subject ?? "")}</TableCell>
                    <TableCell numeric>
                      {typeof it.amount === "number" ? moneyFull(it.amount) : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{String(it.date ?? "")}</TableCell>
                    <TableCell>{String(it.status ?? "")}</TableCell>
                    <TableCell>
                      <RiskBadge level={asRisk(it.risk)} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}
    </Stagger>
  );
}

/* ------------------------------ Финмониторинг ------------------------------ */

function FinanceTab({ person }: { person: Person }) {
  const f = person.finance as
    | {
        accounts?: number;
        banks?: string[];
        totalIn?: number;
        totalOut?: number;
        period?: string;
        schemes?: Array<{ type: string; detail: string; severity: string }>;
        transactions?: Array<Record<string, unknown>>;
      }
    | undefined;

  if (!f) {
    return (
      <EmptyState
        icon={Landmark}
        title="Данные финмониторинга отсутствуют"
        description="По субъекту нет загруженных банковских выписок."
      />
    );
  }

  return (
    <Stagger>
      <SectionCard
        icon={Landmark}
        title="Сводка по счетам"
        collapsible={false}
        action={<OpenInModule href={`/statements?focus=${encodeURIComponent(person.fullName)}`} module="Выписки" />}
      >
        <DataList cols={4} className="p-4 sm:p-5">
          <Field label="Счетов" value={f.accounts != null ? String(f.accounts) : "—"} mono />
          <Field label="Период" value={f.period} />
          <Field
            label="Поступления"
            value={f.totalIn != null ? money(f.totalIn) : "—"}
            mono
            accent
          />
          <Field label="Списания" value={f.totalOut != null ? money(f.totalOut) : "—"} mono />
          <Field label="Банки" value={f.banks?.join(", ")} span={2} />
        </DataList>
      </SectionCard>

      {f.schemes && f.schemes.length > 0 && (
        <SectionCard icon={ShieldCheck} title="Выявленные схемы" collapsible={false}>
          <ul className="flex flex-col">
            {f.schemes.map((s, i) => (
              <li key={i} className="border-b border-border px-4 py-3 last:border-0 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{s.type}</span>
                  <Badge tone={s.severity === "high" ? "danger" : "warning"} size="sm">
                    {s.severity === "high" ? "Высокая" : "Средняя"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {f.transactions && f.transactions.length > 0 && (
        <SectionCard icon={Wallet} title="Операции" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Контрагент</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Направление</TableHead>
                  <TableHead numeric>Сумма</TableHead>
                  <TableHead>Примечание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {f.transactions.map((t, i) => {
                  const income = t.direction === "in";
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {companyCase(String(t.counterparty ?? ""))}
                      </TableCell>
                      <TableCell className="tabular-nums">{String(t.date ?? "")}</TableCell>
                      <TableCell>
                        <Badge tone={income ? "success" : "neutral"} size="sm">
                          {income ? "Поступление" : "Списание"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        numeric
                        className={cn(income ? "text-success-foreground" : "text-foreground")}
                      >
                        {typeof t.amount === "number" ? moneyFull(t.amount) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.flagged ? (
                          <Badge tone="danger" size="sm">
                            {String(t.note ?? "Отмечено")}
                          </Badge>
                        ) : (
                          String(t.note ?? "")
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}
    </Stagger>
  );
}

/* ---------------------------------- Связи ---------------------------------- */

function LinksTab({ person }: { person: Person }) {
  const gov = person.govConnections as
    | {
        level?: string;
        personal?: string;
        relatives?: string;
        bodies?: string;
        links?: Array<Record<string, unknown>>;
      }
    | undefined;

  const connections = person.connections ?? [];

  return (
    <Stagger>
      {gov && (
        <SectionCard icon={Landmark} title="Связи с госслужбой" collapsible={false}>
          <DataList cols={2} className="p-4 sm:p-5">
            <Field label="Личная госслужба" value={gov.personal} />
            <Field label="Родственники" value={gov.relatives} />
            <Field label="Органы" value={gov.bodies} span={2} />
          </DataList>
          {gov.links && gov.links.length > 0 && (
            <TableWrap className="border-t border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Связь</TableHead>
                    <TableHead>Орган</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>Риск</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gov.links.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{String(l.name ?? "")}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {String(l.relation ?? "")}
                      </TableCell>
                      <TableCell>{String(l.body ?? "")}</TableCell>
                      <TableCell>{String(l.position ?? "")}</TableCell>
                      <TableCell>
                        <RiskBadge level={asRisk(l.risk)} size="sm" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrap>
          )}
        </SectionCard>
      )}

      <SectionCard
        icon={Network}
        title="Окружение"
        subtitle={`${connections.length} связей`}
        collapsible={false}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Отношение</TableHead>
                <TableHead numeric>Степень</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.length === 0 ? (
                <TableEmpty colSpan={4}>Связи не обнаружены</TableEmpty>
              ) : (
                connections.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.relation}</TableCell>
                    <TableCell numeric>{c.level}</TableCell>
                    <TableCell>
                      <RiskBadge level={asRisk(c.risk)} size="sm" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Stagger>
  );
}

/* ------------------------------- Перемещения ------------------------------- */

function TravelTab({ person }: { person: Person }) {
  const flights = person.flights ?? [];
  const rail = person.railTickets ?? [];

  if (flights.length === 0 && rail.length === 0) {
    return (
      <EmptyState
        icon={Plane}
        title="Перемещения не зафиксированы"
        description="По субъекту нет данных о перелётах и железнодорожных поездках."
      />
    );
  }

  return (
    <Stagger>
      {flights.length > 0 && (
        <SectionCard
          icon={Plane}
          title="Перелёты"
          subtitle={`${flights.length} записей`}
          collapsible={false}
        >
          <ul className="flex flex-col">
            {flights.map((f, i) => {
              const companions = (f as unknown as { companions?: Array<Record<string, unknown>> })
                .companions;
              return (
                <li key={i} className="border-b border-border px-4 py-3 last:border-0 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{f.route}</span>
                      <Badge tone={f.type === "international" ? "indigo" : "outline"} size="sm">
                        {f.type === "international" ? "Международный" : "Внутренний"}
                      </Badge>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {f.date} · {f.depTime} → {f.arrTime}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[f.fromCity, f.toCity].filter(Boolean).join(" → ")}
                    {f.airline && ` · ${f.airline} ${f.flightNo ?? ""}`}
                    {f.seat && ` · место ${f.seat}`}
                  </p>
                  {companions && companions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {companions.map((c, j) => (
                        <Badge key={j} tone={asRisk(c.risk) === "none" ? "outline" : "danger"} size="sm">
                          {String(c.name ?? "")} · место {String(c.seat ?? "—")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {rail.length > 0 && (
        <SectionCard
          icon={Train}
          title="Железнодорожные поездки"
          subtitle={`${rail.length} записей`}
          collapsible={false}
        >
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Маршрут</TableHead>
                  <TableHead>Поезд</TableHead>
                  <TableHead>Вагон</TableHead>
                  <TableHead>Место</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rail.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="tabular-nums">{r.departureDate}</TableCell>
                    <TableCell className="font-medium">
                      {r.departureRu} → {r.arrivalRu}
                    </TableCell>
                    <TableCell>{r.train}</TableCell>
                    <TableCell className="tabular-nums">{r.coachNumber}</TableCell>
                    <TableCell className="tabular-nums">{r.placeInCoach}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}
    </Stagger>
  );
}

/**
 * Переход из досье в модуль с фокусом на субъекте.
 *
 * В прежней версии это была кнопка «Открыть в модуле «X»» — она уносила в
 * модуль уже отфильтрованным по субъекту, а не на его пустой вход. Фокус
 * передаётся адресом, поэтому ссылку можно переслать.
 */
export function OpenInModule({ href, module }: { href: string; module: string }) {
  /* Ссылка со стилями кнопки, а не Button asChild: Slot принимает ровно
     одного потомка, а кнопке нужны подпись и значок — вместе они его ломают. */
  return (
    <Link href={href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
      {`Открыть в модуле «${module}»`}
      <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2} />
    </Link>
  );
}

/** Ссылка «назад к поиску» — на случай прямого захода по адресу. */
export function BackToSearch() {
  return (
    <Link href="/search" className="text-sm text-link hover:text-link-hover">
      ← К поиску
    </Link>
  );
}
