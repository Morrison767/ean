"use client";

/**
 * Досье юридического лица.
 *
 * Устройство такое же, как у досье физлица: постоянная карточка слева,
 * разделы справа. Совпадение намеренное — аналитик ходит между людьми и
 * компаниями десятки раз за сеанс, и переучиваться на каждом переходе не должен.
 *
 * Разделы «ВЭД», «Госзакупки» и «ЭСФ» собираются не из полей компании, а
 * поиском по общим реестрам через БИН: так карточка остаётся согласованной
 * с реестрами, а не хранит их копию.
 */

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BadgeCheck,
  Building2,
  Download,
  Gavel,
  Home,
  FileSpreadsheet,
  Globe,
  Landmark,
  Mail,
  Network,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { OpenInModule } from "@/components/dossier/person-dossier";
import { Checklist } from "@/components/dossier/checklist";
import { DataList, Field } from "@/components/dossier/data-list";
import { ScoreMeter } from "@/components/dossier/score-meter";
import { CompanyLink, PersonLink } from "@/components/dossier/subject-link";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { ReportProgress, useReportProgress } from "@/components/ui/report-progress";
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
import { money, moneyFull, num, usd } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { companyCase } from "@/lib/utils";
import type { Database } from "@/data/seed";
import type { ChecklistSection, Company, RiskLevel } from "@/data/types";

const TABS = [
  { id: "trust", label: "Благонадёжность", icon: ShieldCheck },
  { id: "basic", label: "Основные данные", icon: Building2 },
  { id: "licenses", label: "Лицензии", icon: BadgeCheck },
  { id: "leadership", label: "Руководство", icon: UserCog },
  { id: "finance", label: "Финансы и налоги", icon: Landmark },
  { id: "esf", label: "ЭСФ", icon: FileSpreadsheet },
  { id: "ved", label: "ВЭД", icon: Globe },
  { id: "property", label: "Имущество", icon: Home },
  { id: "legal", label: "Суды и проверки", icon: Gavel },
  { id: "structure", label: "Структура", icon: Network },
  { id: "procurement", label: "Госзакупки", icon: ShoppingCart },
];

const asRisk = (v: unknown): RiskLevel =>
  (["none", "medium", "high"] as const).includes(v as RiskLevel)
    ? (v as RiskLevel)
    : "none";

export function CompanyDossier({
  company,
  checklist,
  db,
}: {
  company: Company;
  checklist: ChecklistSection[];
  db: Database;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const report = useReportProgress();

  const tab = params.get("tab") ?? "trust";
  const setTab = (id: string) =>
    router.replace(`/company/${company.id}?tab=${id}`, { scroll: false });

  /* Записи реестров, относящиеся к этой компании. */
  const related = useMemo(
    () => ({
      declarations: db.declarations.filter((d) => d.bin === company.bin),
      invoices: db.invoices.filter(
        (i) => i.supplierBin === company.bin || i.customerBin === company.bin
      ),
      procurements: db.procurements.filter(
        (p) => p.winnerBin === company.bin || p.customerBin === company.bin
      ),
    }),
    [db, company.bin]
  );

  const name = companyCase(company.name);

  return (
    <Screen className="max-w-[1500px]">
      <ReportProgress phase={report.phase} label="Формируется досье…" />
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-accent text-primary">
                <Building2 className="h-9 w-9" strokeWidth={1.5} />
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-h4 font-semibold leading-tight text-foreground">{name}</h1>
                <p className="text-xs tabular-nums text-muted-foreground">БИН {company.bin}</p>
              </div>
            </div>

            <ScoreMeter score={company.score} level={company.riskLevel} />

            {company.riskTags && company.riskTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {company.riskTags.map((t) => (
                  <Badge key={t} tone="danger" size="sm">
                    {RISK_TAG_LABEL[t] ?? t}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
              {company.phone && (
                <span className="flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-icon-secondary" />
                  {company.phone}
                </span>
              )}
              {company.email && (
                <span className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 shrink-0 text-icon-secondary" />
                  <span className="truncate">{company.email}</span>
                </span>
              )}
              {company.website && (
                <span className="flex items-center gap-2 text-foreground">
                  <Globe className="h-4 w-4 shrink-0 text-icon-secondary" />
                  <span className="truncate">{company.website}</span>
                </span>
              )}
            </div>

            <DataList cols={2} className="border-t border-border pt-4">
              <Field label="Форма" value={company.orgForm} />
              <Field label="Размер" value={company.businessSize} />
              <Field label="Сотрудников" value={company.employees != null ? num(company.employees) : "—"} mono />
              <Field label="Зарегистрирована" value={company.registeredAt} mono />
              <Field label="Адрес" value={company.address} span={2} />
            </DataList>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button icon={Sparkles}>Портрет AI</Button>
              <Button variant="secondary" icon={Download} onClick={report.start}>
                Скачать досье
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

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
                  flags={company.reliabilityFlags ?? []}
                  checks={company.reliabilityChecks ?? []}
                />
              )}
              {tab === "basic" && <GeneralTab company={company} />}
              {tab === "licenses" && <LicensesTab company={company} />}
              {tab === "leadership" && <LeadershipTab company={company} />}
              {tab === "finance" && <FinanceTab company={company} />}
              {tab === "esf" && <EsfTab items={related.invoices} bin={company.bin} />}
              {tab === "ved" && <VedTab company={company} declarations={related.declarations} />}
              {tab === "property" && <PropertyTab company={company} />}
              {tab === "legal" && <LegalTab company={company} />}
              {tab === "structure" && <StructureTab company={company} />}
              {tab === "procurement" && <ProcurementTab items={related.procurements} bin={company.bin} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------ Общие сведения ------------------------------ */

function GeneralTab({ company }: { company: Company }) {
  return (
    <Stagger>
      <SectionCard icon={Building2} title="Регистрационные данные" collapsible={false}>
        <DataList cols={3} className="p-4 sm:p-5">
          <Field label="ОКЭД" value={company.okd} mono />
          <Field label="Вид деятельности" value={company.activityType} span={2} />
          <Field label="Форма собственности" value={company.ownershipForm} />
          <Field label="Перерегистрация" value={company.reRegisteredAt} mono />
          <Field label="Регистрирующий орган" value={company.registeringBody} />
          {company.nameHistory && company.nameHistory.length > 0 && (
            <Field label="Прежние названия" value={company.nameHistory.join("; ")} span={2} />
          )}
        </DataList>
      </SectionCard>

      {company.bankDetails && company.bankDetails.length > 0 && (
        <SectionCard icon={Landmark} title="Банковские реквизиты" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ИИК</TableHead>
                  <TableHead>БИК</TableHead>
                  <TableHead>Банк</TableHead>
                  <TableHead>КБе</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.bankDetails.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="tabular-nums">{b.iik}</TableCell>
                    <TableCell className="tabular-nums">{b.bik}</TableCell>
                    <TableCell>{b.bank}</TableCell>
                    <TableCell className="tabular-nums">{b.kbe}</TableCell>
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

/* --------------------------------- Лицензии --------------------------------- */

function LicensesTab({ company }: { company: Company }) {
  if (!company.licenses?.length) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Лицензий не найдено"
        description="У организации нет разрешительных документов."
      />
    );
  }
  return (
    <Stagger>
      <SectionCard icon={BadgeCheck} title="Лицензии и разрешения" collapsible={false}>
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Наименование</TableHead>
                <TableHead>Номер</TableHead>
                <TableHead>Выдана</TableHead>
                <TableHead>Орган</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.licenses.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="tabular-nums">{l.number}</TableCell>
                  <TableCell className="tabular-nums">{l.issued}</TableCell>
                  <TableCell className="text-muted-foreground">{l.authority}</TableCell>
                  <TableCell>
                    <Badge tone="success" size="sm">{l.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Stagger>
  );
}

/* -------------------------------- Руководство -------------------------------- */

function LeadershipTab({ company }: { company: Company }) {
  return (
    <Stagger>
      {company.manager && (
        <SectionCard icon={UserCog} title="Действующий руководитель" collapsible={false}>
          <DataList cols={3} className="p-4 sm:p-5">
            <Field label="ФИО" value={<PersonLink name={company.manager.name} iin={company.manager.iin} />} />
            <Field label="ИИН" value={company.manager.iin} mono />
            <Field label="Назначен" value={company.manager.appointedAt} mono />
            {company.manager.affiliated ? (
              <Field
                label="Аффилированность"
                value={<Badge tone="warning" size="sm">Выявлена</Badge>}
              />
            ) : null}
          </DataList>
        </SectionCard>
      )}

      {company.managerHistory && company.managerHistory.length > 0 && (
        <SectionCard icon={UserCog} title="История руководителей" collapsible={false}>
          <ul className="flex flex-col">
            {company.managerHistory.map((m, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-0 sm:px-5"
              >
                <span className="text-sm text-foreground">{String(m.name ?? "")}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {String(m.period ?? "")}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </Stagger>
  );
}

/* --------------------------------- Имущество --------------------------------- */

function PropertyTab({ company }: { company: Company }) {
  const nothing =
    !company.realEstate?.length && !company.vehicles?.length && !company.encumbrances?.length;
  if (nothing) {
    return (
      <EmptyState
        icon={Home}
        title="Имущество не зарегистрировано"
        description="За организацией не числится недвижимости и транспорта."
      />
    );
  }

  return (
    <Stagger>
      {company.realEstate && company.realEstate.length > 0 && (
        <SectionCard icon={Home} title="Недвижимость" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead>Кадастровый номер</TableHead>
                  <TableHead numeric>Доля</TableHead>
                  <TableHead>Регистрация</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.realEstate.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.type}</TableCell>
                    <TableCell>{r.address}</TableCell>
                    <TableCell className="tabular-nums">{r.cadastral}</TableCell>
                    <TableCell numeric>{r.share}</TableCell>
                    <TableCell className="tabular-nums">{r.registered}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}

      {company.vehicles && company.vehicles.length > 0 && (
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
                {company.vehicles.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{v.model}</TableCell>
                    <TableCell className="tabular-nums">{v.plate}</TableCell>
                    <TableCell className="tabular-nums">{v.vin}</TableCell>
                    <TableCell numeric>{v.year}</TableCell>
                    <TableCell>
                      {v.encumbrance ? (
                        <Badge tone="danger" size="sm">{v.encumbrance}</Badge>
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

      {company.encumbrances && company.encumbrances.length > 0 && (
        <SectionCard icon={Gavel} title="Обременения" collapsible={false}>
          <ul className="flex flex-col">
            {company.encumbrances.map((e, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0 sm:px-5"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {String(e.type ?? "")}
                  </span>
                  <Badge tone="danger" size="sm">{String(e.status ?? "")}</Badge>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {String(e.date ?? "")}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{String(e.detail ?? "")}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </Stagger>
  );
}

/* ------------------------------ Суды и проверки ------------------------------ */

function LegalTab({ company }: { company: Company }) {
  const nothing =
    !company.courtCases?.length && !company.inspections?.length && !company.fines?.length;
  if (nothing) {
    return (
      <EmptyState
        icon={Gavel}
        title="Судов и проверок не зафиксировано"
        description="В отношении организации нет дел, проверок и штрафов."
      />
    );
  }

  return (
    <Stagger>
      {company.courtCases && company.courtCases.length > 0 && (
        <SectionCard icon={Gavel} title="Судебные дела" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Вид</TableHead>
                  <TableHead>Номер</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.courtCases.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.kind}</TableCell>
                    <TableCell className="tabular-nums">{c.number}</TableCell>
                    <TableCell className="text-muted-foreground">{c.role}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell className="tabular-nums">{c.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}

      {company.inspections && company.inspections.length > 0 && (
        <SectionCard icon={ShieldCheck} title="Проверки" collapsible={false}>
          <ul className="flex flex-col">
            {company.inspections.map((ins, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0 sm:px-5"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {String(ins.kind ?? "")}
                  </span>
                  <span className="text-xs text-muted-foreground">{String(ins.body ?? "")}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {String(ins.date ?? "")}
                  </span>
                </span>
                <span className="text-xs">
                  <Badge tone={ins.tone === "bad" ? "danger" : "success"} size="sm">
                    {String(ins.result ?? "")}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {company.fines && company.fines.length > 0 && (
        <SectionCard icon={Gavel} title="Штрафы" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Основание</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead numeric>Сумма</TableHead>
                  <TableHead>Оплачен</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.fines.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell>{f.reason}</TableCell>
                    <TableCell className="tabular-nums">{f.date}</TableCell>
                    <TableCell numeric>{moneyFull(f.amount)}</TableCell>
                    <TableCell>
                      <Badge tone={f.paid ? "success" : "danger"} size="sm">
                        {f.paid ? "Оплачен" : "Не оплачен"}
                      </Badge>
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

/* --------------------------------- Структура --------------------------------- */

function StructureTab({ company }: { company: Company }) {
  const founders = company.foundersDetailed ?? company.founders ?? [];

  return (
    <Stagger>
      <SectionCard
        icon={Users}
        title="Учредители"
        subtitle={
          company.foundersCount != null
            ? `Всего ${num(company.foundersCount)}, показаны основные`
            : undefined
        }
        collapsible={false}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Наименование</TableHead>
                <TableHead>ИИН/БИН</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead numeric>Доля</TableHead>
                <TableHead>Период</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {founders.length === 0 ? (
                <TableEmpty colSpan={6}>Сведения об учредителях отсутствуют</TableEmpty>
              ) : (
                founders.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {String(f.type ?? "") === "Юрлицо" ? (
                        <CompanyLink name={String(f.name ?? "")} bin={String(f.bin ?? "")} />
                      ) : (
                        <PersonLink
                          name={String(f.name ?? f.fullName ?? "")}
                          iin={String(f.iin ?? "")}
                        />
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{String(f.iin ?? f.bin ?? "")}</TableCell>
                    <TableCell className="text-muted-foreground">{String(f.type ?? "—")}</TableCell>
                    <TableCell numeric>{String(f.share ?? "—")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {String(f.period ?? "—")}
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={asRisk(f.risk)} size="sm" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>

      {company.subsidiaries && company.subsidiaries.length > 0 && (
        <SectionCard icon={Network} title="Дочерние организации" collapsible={false}>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Наименование</TableHead>
                  <TableHead>БИН</TableHead>
                  <TableHead numeric>Доля</TableHead>
                  <TableHead>Риск</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.subsidiaries.map((sub, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      <CompanyLink
                        name={companyCase(String(sub.name ?? ""))}
                        bin={String(sub.bin ?? "")}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums">{String(sub.bin ?? "")}</TableCell>
                    <TableCell numeric>{String(sub.share ?? "—")}</TableCell>
                    <TableCell>
                      <RiskBadge level={asRisk(sub.risk)} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}

      {company.relatedEntities && company.relatedEntities.length > 0 && (
        <SectionCard
          icon={Network}
          title="Связанные организации"
          subtitle="Общие учредители и аффилированность по цепочке поставок"
          collapsible={false}
        >
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Наименование</TableHead>
                  <TableHead>БИН</TableHead>
                  <TableHead>Характер связи</TableHead>
                  <TableHead>Риск</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.relatedEntities.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      <CompanyLink
                        name={companyCase(String(r.name ?? ""))}
                        bin={String(r.bin ?? "")}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums">{String(r.bin ?? "")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {String(r.relation ?? "")}
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={asRisk(r.risk)} size="sm" />
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

/* ----------------------------- Финансы и налоги ----------------------------- */

function FinanceTab({ company }: { company: Company }) {
  const f = company.finance as
    | { revenue?: number; expenses?: number; taxes?: number; turnover?: number; fot?: number }
    | undefined;

  return (
    <Stagger>
      <SectionCard icon={Landmark} title="Финансовые показатели" collapsible={false}>
        <DataList cols={4} className="p-4 sm:p-5">
          <Field label="Оборот" value={f?.turnover != null ? money(f.turnover) : "—"} mono accent />
          <Field label="Доход" value={f?.revenue != null ? money(f.revenue) : "—"} mono />
          <Field label="Расходы" value={f?.expenses != null ? money(f.expenses) : "—"} mono />
          <Field label="Налоги" value={f?.taxes != null ? money(f.taxes) : "—"} mono />
          <Field label="ФОТ" value={f?.fot != null ? money(f.fot) : "—"} mono />
        </DataList>
      </SectionCard>

      <SectionCard icon={ShieldCheck} title="Налоговый профиль" collapsible={false}>
        <DataList cols={3} className="p-4 sm:p-5">
          <Field label="Режим" value={company.taxRegime} />
          <Field label="Плательщик НДС" value={company.vatPayer ? "Да" : "Нет"} />
          <Field label="Степень риска" value={company.taxpayerRisk} />
          <Field label="Крупный налогоплательщик" value={company.majorTaxpayer ? "Да" : "Нет"} />
          <Field
            label="Налоговая задолженность"
            value={
              company.taxDebt ? (
                <Badge tone="danger" size="sm">
                  {moneyFull(company.taxDebt)}
                </Badge>
              ) : (
                "нет"
              )
            }
          />
          <Field
            label="Таможенная задолженность"
            value={company.customsDebt ? moneyFull(company.customsDebt) : "нет"}
            mono
          />
        </DataList>
      </SectionCard>

      {company.taxByYear && company.taxByYear.length > 0 && (
        <SectionCard icon={Wallet} title="Налоги по годам" collapsible={false}>
          <DataList cols={4} className="p-4 sm:p-5">
            {company.taxByYear.map((t, i) => (
              <Field key={i} label={String(t.year)} value={money(t.amount)} mono />
            ))}
          </DataList>
        </SectionCard>
      )}
    </Stagger>
  );
}

/* ---------------------------------- ВЭД ---------------------------------- */

function VedTab({
  company,
  declarations,
}: {
  company: Company;
  declarations: Database["declarations"];
}) {
  /* Риски ВЭД приходят объектами с пояснением, а не строками: подсказка
     объясняет, на чём основан вывод, и её нельзя терять. */
  const v = company.ved as
    | {
        totalImport?: number;
        totalExport?: number;
        risks?: Array<{ title: string; severity: string; tooltip?: string }>;
      }
    | undefined;

  return (
    <Stagger>
      <SectionCard
        icon={Globe}
        title="Внешнеэкономическая деятельность"
        collapsible={false}
        action={<OpenInModule href={`/ved?focus=${encodeURIComponent(company.bin)}`} module="ВЭД" />}
      >
        <DataList cols={3} className="p-4 sm:p-5">
          <Field label="Импорт" value={v?.totalImport != null ? usd(v.totalImport) : "—"} mono accent />
          <Field label="Экспорт" value={v?.totalExport != null ? usd(v.totalExport) : "—"} mono />
          <Field label="Деклараций" value={num(declarations.length)} mono />
        </DataList>
      </SectionCard>

      {v?.risks && v.risks.length > 0 && (
        <SectionCard icon={ShieldCheck} title="Признаки риска" collapsible={false}>
          <ul className="flex flex-col">
            {v.risks.map((r, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0 sm:px-5"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{r.title}</span>
                  <Badge tone={r.severity === "high" ? "danger" : "warning"} size="sm">
                    {r.severity === "high" ? "Высокий" : "Средний"}
                  </Badge>
                </span>
                {r.tooltip && (
                  <span className="text-xs text-muted-foreground">{r.tooltip}</span>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard icon={Globe} title="Декларации" collapsible={false}>
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Направление</TableHead>
                <TableHead>Товар</TableHead>
                <TableHead>ТН ВЭД</TableHead>
                <TableHead numeric>Стоимость</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {declarations.length === 0 ? (
                <TableEmpty colSpan={7}>Декларации не найдены</TableEmpty>
              ) : (
                declarations.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap font-medium">{d.id}</TableCell>
                    <TableCell className="tabular-nums">{d.date}</TableCell>
                    <TableCell>
                      <Badge tone={d.type === "import" ? "indigo" : "teal"} size="sm">
                        {d.type === "import" ? "Импорт" : "Экспорт"}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.product}</TableCell>
                    <TableCell className="tabular-nums">{d.hsCode}</TableCell>
                    <TableCell numeric>{usd(d.valueUsd)}</TableCell>
                    <TableCell>
                      <RiskBadge level={d.risk} size="sm" />
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

/* ------------------------------- Госзакупки ------------------------------- */

function ProcurementTab({
  items,
  bin,
}: {
  items: Database["procurements"];
  bin: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Участие в госзакупках не найдено"
        description="Организация не значится ни победителем, ни заказчиком."
      />
    );
  }

  return (
    <Stagger>
      <SectionCard
        icon={ShoppingCart}
        title="Закупки"
        subtitle={`${items.length} записей`}
        collapsible={false}
        action={<OpenInModule href={`/procurement?focus=${encodeURIComponent(bin)}`} module="Закупки" />}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Предмет</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Способ</TableHead>
                <TableHead numeric>Сумма договора</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap tabular-nums font-medium">{p.id}</TableCell>
                  <TableCell>{p.subject}</TableCell>
                  <TableCell>
                    <Badge tone="outline" size="sm">
                      {p.winnerBin === bin ? "Поставщик" : "Заказчик"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.method}</TableCell>
                  <TableCell numeric>{moneyFull(p.contractAmount)}</TableCell>
                  <TableCell>
                    <RiskBadge level={p.risk} size="sm" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Stagger>
  );
}

/* ---------------------------------- ЭСФ ---------------------------------- */

function EsfTab({ items, bin }: { items: Database["invoices"]; bin: string }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Счета-фактуры не найдены"
        description="По организации нет выписанных или полученных ЭСФ."
      />
    );
  }

  return (
    <Stagger>
      <SectionCard
        icon={FileSpreadsheet}
        title="Счета-фактуры"
        subtitle={`${items.length} записей`}
        collapsible={false}
        action={<OpenInModule href={`/esf/${bin}`} module="ЭСФ" />}
      >
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead>Товар</TableHead>
                <TableHead numeric>Сумма</TableHead>
                <TableHead>Риск</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((v) => {
                const supplier = v.supplierBin === bin;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap tabular-nums font-medium">{v.id}</TableCell>
                    <TableCell className="tabular-nums">{v.date}</TableCell>
                    <TableCell>
                      <Badge tone="outline" size="sm">
                        {supplier ? "Поставщик" : "Покупатель"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {companyCase(supplier ? v.customer : v.supplier)}
                    </TableCell>
                    <TableCell>{v.product}</TableCell>
                    <TableCell numeric>{moneyFull(v.amount)}</TableCell>
                    <TableCell>
                      <RiskBadge level={v.risk} size="sm" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Stagger>
  );
}
