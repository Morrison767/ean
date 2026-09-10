"use client";

/**
 * Досье: сводка по стране.
 *
 * У модуля нет «оборота», по которому можно построить картину, — единица здесь
 * субъект. Поэтому масштаб задают не суммы, а срабатывания: сколько субъектов,
 * у скольких есть признаки, какие именно и кто с кем связан. Каждая вкладка
 * разворачивает один срез до первичных строк, а не до второго дашборда.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Car,
  Gavel,
  Home,
  LayoutDashboard,
  Link2,
  Receipt,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { BarList } from "@/components/charts/bar-list";
import { RISK_SHARE_COLOR, ShareDonut } from "@/components/charts/share-donut";
import { HeroStat, Insight } from "@/components/modules/country/shell";
import {
  RegistryTable,
  RegistryToolbar,
  useRegistryFilter,
} from "@/components/modules/registry";
import { Badge, RISK_META, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Stagger } from "@/components/ui/stagger";
import { UnderlineTabs } from "@/components/ui/tabs";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { RISK_TAG_FULL, RISK_TAG_LABEL } from "@/config/dashboard";
import { money, num, percent } from "@/lib/format";
import { companyCase } from "@/lib/utils";
import { useApp } from "@/store/use-app";
import type { Company, Person, RiskLevel, RiskTag } from "@/data/types";

const TABS = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "subjects", label: "Реестр субъектов", icon: Users },
  { id: "flags", label: "Признаки риска", icon: ShieldAlert },
  { id: "links", label: "Связи", icon: Link2 },
  { id: "assets", label: "Активы", icon: Home },
  { id: "courts", label: "Суды и штрафы", icon: Gavel },
];

/** Плоская строка реестра субъектов: физлица и юрлица в одной таблице. */
interface SubjectRow {
  key: string;
  kind: "person" | "company";
  href: string;
  name: string;
  code: string;
  /** Должность для человека, вид деятельности для компании. */
  role: string;
  risk: RiskLevel;
  score: number;
  tags: RiskTag[];
  flags: number;
  courts: number;
  assets: number;
}

function buildRows(people: Person[], companies: Company[]): SubjectRow[] {
  const rows: SubjectRow[] = [
    ...people.map((p) => ({
      key: `person-${p.id}`,
      kind: "person" as const,
      href: `/person/${p.id}`,
      name: p.fullName,
      code: p.iin,
      /* Действующий договор точнее, чем currentJob: тот в фикстурах местами
         расходится с историей занятости. */
      role:
        p.employment?.find((e) => !e.end && e.kind !== "participation")?.position ??
        p.currentJob?.position ??
        "—",
      risk: p.riskLevel,
      score: p.score,
      tags: (p.riskTags ?? []).filter((t) => String(t) !== "none"),
      flags: (p.trustFlags ?? []).length,
      courts: (p.courtCases ?? []).length,
      assets: (p.realEstate ?? []).length + (p.vehicles ?? []).length,
    })),
    ...companies.map((c) => ({
      key: `company-${c.id}`,
      kind: "company" as const,
      href: `/company/${c.id}`,
      name: companyCase(c.name),
      code: c.bin,
      role: c.activityType ?? "—",
      risk: c.riskLevel,
      score: c.score,
      tags: (c.riskTags ?? []).filter((t) => String(t) !== "none"),
      flags: (c.reliabilityFlags ?? []).length,
      courts: (c.courtCases ?? []).length,
      assets: (c.realEstate ?? []).length + (c.vehicles ?? []).length,
    })),
  ];
  /* Тяжёлые сверху: сводку читают с наиболее рискованных субъектов. */
  return rows.sort((a, b) => b.score - a.score);
}

export function DossierCountry() {
  const router = useRouter();
  const people = useApp((s) => s.db.people);
  const companies = useApp((s) => s.db.companies);
  const [tab, setTab] = useState("overview");

  const rows = useMemo(() => buildRows(people, companies), [people, companies]);
  const risky = rows.filter((r) => r.risk !== "none");
  const debt = companies.reduce((s, c) => s + (c.taxDebt ?? 0), 0);

  return (
    <Screen
      title="Досье: сводка по стране"
      subtitle="Субъекты, признаки риска, связи и активы по всей базе досье"
      actions={
        <Button variant="secondary" icon={Search} onClick={() => router.push("/search")}>
          К поиску
        </Button>
      }
    >
      <button
        type="button"
        onClick={() => router.push("/search")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Глобальный поиск
      </button>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <HeroStat label="Субъектов" value={num(rows.length)} icon={Users} />
        <HeroStat label="Физических лиц" value={num(people.length)} icon={Users} />
        <HeroStat label="Юридических лиц" value={num(companies.length)} icon={Building2} />
        <HeroStat
          label="С признаками риска"
          value={num(risky.length)}
          hint={percent((risky.length / Math.max(rows.length, 1)) * 100)}
          icon={AlertTriangle}
          tone="danger"
        />
        <HeroStat
          label="Налоговая задолженность"
          value={money(debt)}
          hint="по юрлицам базы"
          icon={Receipt}
          tone={debt > 0 ? "danger" : "default"}
        />
      </div>

      <UnderlineTabs items={TABS} value={tab} onChange={setTab} />

      {tab === "overview" && <Overview rows={rows} companies={companies} />}
      {tab === "subjects" && <Subjects rows={rows} />}
      {tab === "flags" && <Flags rows={rows} people={people} companies={companies} />}
      {tab === "links" && <Links people={people} companies={companies} />}
      {tab === "assets" && <Assets people={people} companies={companies} />}
      {tab === "courts" && <Courts people={people} companies={companies} />}
    </Screen>
  );
}

/* --------------------------------- Обзор --------------------------------- */

function Overview({ rows, companies }: { rows: SubjectRow[]; companies: Company[] }) {
  const levels: RiskLevel[] = ["high", "medium", "none"];
  const byLevel = levels
    .map((lvl) => ({
      key: lvl,
      label: RISK_META[lvl].label,
      value: rows.filter((r) => r.risk === lvl).length,
      display: `${rows.filter((r) => r.risk === lvl).length}`,
      color: RISK_SHARE_COLOR[lvl],
    }))
    .filter((i) => i.value > 0);

  /* Частота тегов, а не сумма: тег — это факт, у него нет величины. */
  const tags = useMemo(() => {
    const map = new Map<RiskTag, number>();
    for (const r of rows) for (const t of r.tags) map.set(t, (map.get(t) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const risky = rows.filter((r) => r.risk !== "none");
  const debtor = [...companies].sort((a, b) => (b.taxDebt ?? 0) - (a.taxDebt ?? 0))[0];
  const worst = rows[0];

  return (
    <Stagger>
      <div className="grid gap-3 lg:grid-cols-3">
        <Insight
          icon={AlertTriangle}
          tone={risky.length / Math.max(rows.length, 1) > 0.5 ? "danger" : "warning"}
          title="Доля субъектов с признаками"
          value={percent((risky.length / Math.max(rows.length, 1)) * 100)}
          detail={`${risky.length} из ${rows.length} субъектов базы`}
        />
        <Insight
          icon={ShieldAlert}
          tone="warning"
          title="Самый частый признак"
          value={tags[0] ? (RISK_TAG_FULL[tags[0][0]] ?? tags[0][0]) : "—"}
          detail={tags[0] ? `встречается у ${tags[0][1]} субъектов` : "признаков нет"}
        />
        <Insight
          icon={Receipt}
          tone={debtor?.taxDebt ? "danger" : "neutral"}
          title="Крупнейший долг по налогам"
          value={money(debtor?.taxDebt ?? 0)}
          detail={debtor ? companyCase(debtor.name) : "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={AlertTriangle} title="Распределение по уровню риска" collapsible={false}>
          <ShareDonut items={byLevel} columns={["Уровень риска", "Субъектов"]} />
        </SectionCard>
        <SectionCard icon={ShieldAlert} title="Признаки риска по частоте" collapsible={false}>
          <BarList
            items={tags.map(([tag, count]) => ({
              label: RISK_TAG_FULL[tag] ?? tag,
              value: count,
              display: `${count}`,
              hint: count === 1 ? "1 субъект" : `${count} субъектов`,
            }))}
          />
        </SectionCard>
      </div>

      <SectionCard
        icon={Users}
        title="Наибольший риск-балл"
        subtitle={worst ? `максимум — ${worst.score} у «${worst.name}»` : undefined}
        collapsible={false}
      >
        <BarList
          items={rows.slice(0, 8).map((r) => ({
            label: r.name,
            value: r.score,
            display: `${r.score}`,
            hint: RISK_META[r.risk].label,
          }))}
        />
      </SectionCard>
    </Stagger>
  );
}

/* --------------------------- Реестр субъектов --------------------------- */

function Subjects({ rows }: { rows: SubjectRow[] }) {
  const router = useRouter();
  const f = useRegistryFilter(rows, (r) => [r.name, r.code, r.role, ...r.tags.map((t) => RISK_TAG_LABEL[t])]);

  return (
    <div className="flex flex-col gap-4">
      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="ФИО, название, ИИН/БИН, должность или признак"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["субъект", "субъекта", "субъектов"]}
        empty={{ title: "Субъекты не найдены", description: "Измените запрос или фильтр." }}
        head={
          <>
            <TableHead>Субъект</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>ИИН / БИН</TableHead>
            <TableHead>Должность / деятельность</TableHead>
            <TableHead>Признаки</TableHead>
            <TableHead numeric>Балл</TableHead>
            <TableHead>Риск</TableHead>
          </>
        }
        rows={f.filtered.map((r) => (
          <TableRow key={r.key} interactive onClick={() => router.push(r.href)}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell>
              <Badge tone={r.kind === "person" ? "indigo" : "teal"} size="sm">
                {r.kind === "person" ? "Физлицо" : "Юрлицо"}
              </Badge>
            </TableCell>
            <TableCell className="tabular-nums">{r.code}</TableCell>
            <TableCell className="max-w-[280px] truncate">{r.role}</TableCell>
            <TableCell>
              {r.tags.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {r.tags.map((t) => (
                    <Badge key={t} tone="outline" size="sm">
                      {RISK_TAG_LABEL[t] ?? t}
                    </Badge>
                  ))}
                </span>
              )}
            </TableCell>
            <TableCell numeric>{r.score}</TableCell>
            <TableCell>
              <RiskBadge level={r.risk} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

/* ---------------------------- Признаки риска ---------------------------- */

/** Срабатывание чек-листа: субъект плюс формулировка признака. */
interface FlagRow {
  key: string;
  subject: string;
  code: string;
  href: string;
  kind: "person" | "company";
  flag: string;
  risk: RiskLevel;
}

function Flags({
  rows,
  people,
  companies,
}: {
  rows: SubjectRow[];
  people: Person[];
  companies: Company[];
}) {
  const router = useRouter();

  const flags = useMemo<FlagRow[]>(
    () => [
      ...people.flatMap((p) =>
        (p.trustFlags ?? []).map((flag, i) => ({
          key: `p-${p.id}-${i}`,
          subject: p.fullName,
          code: p.iin,
          href: `/person/${p.id}`,
          kind: "person" as const,
          flag,
          risk: p.riskLevel,
        }))
      ),
      ...companies.flatMap((c) =>
        (c.reliabilityFlags ?? []).map((flag, i) => ({
          key: `c-${c.id}-${i}`,
          subject: companyCase(c.name),
          code: c.bin,
          href: `/company/${c.id}`,
          kind: "company" as const,
          flag,
          risk: c.riskLevel,
        }))
      ),
    ],
    [people, companies]
  );

  const f = useRegistryFilter(flags, (r) => [r.subject, r.code, r.flag]);

  /* Одна и та же формулировка у нескольких субъектов — это уже не единичный
     случай, а закономерность; поэтому наверху частоты, а не список. */
  const frequency = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of flags) map.set(r.flag, (map.get(r.flag) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [flags]);

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        icon={ShieldAlert}
        title="Что срабатывает чаще всего"
        subtitle={`${flags.length} срабатываний у ${rows.filter((r) => r.flags > 0).length} субъектов`}
        collapsible={false}
      >
        <BarList
          items={frequency.slice(0, 10).map(([flag, count]) => ({
            label: flag,
            value: count,
            display: `${count}`,
          }))}
        />
      </SectionCard>

      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Субъект, ИИН/БИН или формулировка признака"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["срабатывание", "срабатывания", "срабатываний"]}
        empty={{ title: "Признаки не найдены", description: "Измените запрос или фильтр." }}
        head={
          <>
            <TableHead>Субъект</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>ИИН / БИН</TableHead>
            <TableHead>Признак</TableHead>
            <TableHead>Риск субъекта</TableHead>
          </>
        }
        rows={f.filtered.map((r) => (
          <TableRow key={r.key} interactive onClick={() => router.push(r.href)}>
            <TableCell className="font-medium">{r.subject}</TableCell>
            <TableCell>
              <Badge tone={r.kind === "person" ? "indigo" : "teal"} size="sm">
                {r.kind === "person" ? "Физлицо" : "Юрлицо"}
              </Badge>
            </TableCell>
            <TableCell className="tabular-nums">{r.code}</TableCell>
            <TableCell>{r.flag}</TableCell>
            <TableCell>
              <RiskBadge level={r.risk} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

/* --------------------------------- Связи --------------------------------- */

interface LinkRow {
  key: string;
  from: string;
  to: string;
  relation: string;
  detail: string;
  risk: RiskLevel;
}

function Links({ people, companies }: { people: Person[]; companies: Company[] }) {
  const links = useMemo<LinkRow[]>(
    () => [
      ...people.flatMap((p) =>
        (p.connections ?? []).map((c, i) => ({
          key: `pc-${p.id}-${i}`,
          from: p.fullName,
          to: c.name,
          relation: c.relation,
          detail: `${c.level}-й уровень`,
          risk: c.risk ?? "none",
        }))
      ),
      ...people.flatMap((p) =>
        (p.businesses ?? []).map((b, i) => ({
          key: `pb-${p.id}-${i}`,
          from: p.fullName,
          to: companyCase(String(b.name ?? "—")),
          relation: String(b.role ?? "Участие в бизнесе"),
          detail: [b.share, b.status].filter(Boolean).join(" · ") || "—",
          risk: (b.risk as RiskLevel) ?? "none",
        }))
      ),
      ...companies.flatMap((c) =>
        (c.relatedEntities ?? []).map((r, i) => ({
          key: `cr-${c.id}-${i}`,
          from: companyCase(c.name),
          to: companyCase(String(r.name ?? "—")),
          relation: String(r.relation ?? "Связанное лицо"),
          detail: String(r.bin ?? "—"),
          risk: (r.risk as RiskLevel) ?? "none",
        }))
      ),
      ...companies.flatMap((c) =>
        (c.subsidiaries ?? []).map((s, i) => ({
          key: `cs-${c.id}-${i}`,
          from: companyCase(c.name),
          to: companyCase(String(s.name ?? "—")),
          relation: "Дочерняя организация",
          detail: [s.bin, s.share].filter(Boolean).join(" · ") || "—",
          risk: (s.risk as RiskLevel) ?? "none",
        }))
      ),
    ],
    [people, companies]
  );

  const f = useRegistryFilter(links, (r) => [r.from, r.to, r.relation, r.detail]);

  /* Узел, который встречается в нескольких связях, и есть точка пересечения
     разных субъектов — на неё и стоит смотреть первой. */
  const hubs = useMemo(() => {
    const map = new Map<string, { count: number; risk: RiskLevel }>();
    for (const l of links) {
      const prev = map.get(l.to) ?? { count: 0, risk: "none" as RiskLevel };
      prev.count += 1;
      if (l.risk === "high" || (l.risk === "medium" && prev.risk === "none")) prev.risk = l.risk;
      map.set(l.to, prev);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [links]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <Insight
          icon={Link2}
          tone="neutral"
          title="Всего связей в базе"
          value={num(links.length)}
          detail={`${hubs.length} различных контрагентов и лиц`}
        />
        <Insight
          icon={AlertTriangle}
          tone="danger"
          title="Связи с высоким риском"
          value={num(links.filter((l) => l.risk === "high").length)}
          detail="контрагент или лицо с высоким риском на другом конце"
        />
        <Insight
          icon={Users}
          tone={hubs[0] && hubs[0][1].count > 1 ? "warning" : "neutral"}
          title="Пересечение субъектов"
          value={hubs[0]?.[0] ?? "—"}
          detail={hubs[0] ? `упоминается в ${hubs[0][1].count} связях` : "пересечений нет"}
        />
      </div>

      <SectionCard icon={Link2} title="Наиболее упоминаемые узлы" collapsible={false}>
        <BarList
          items={hubs.slice(0, 8).map(([name, info]) => ({
            label: name,
            value: info.count,
            display: `${info.count}`,
            hint: RISK_META[info.risk].label,
          }))}
        />
      </SectionCard>

      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Субъект, контрагент или тип связи"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["связь", "связи", "связей"]}
        empty={{ title: "Связи не найдены", description: "Измените запрос или фильтр." }}
        head={
          <>
            <TableHead>Субъект</TableHead>
            <TableHead>Связан с</TableHead>
            <TableHead>Тип связи</TableHead>
            <TableHead>Детали</TableHead>
            <TableHead>Риск связи</TableHead>
          </>
        }
        rows={f.filtered.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="font-medium">{r.from}</TableCell>
            <TableCell>{r.to}</TableCell>
            <TableCell>{r.relation}</TableCell>
            <TableCell className="text-muted-foreground">{r.detail}</TableCell>
            <TableCell>
              <RiskBadge level={r.risk} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

/* -------------------------------- Активы -------------------------------- */

interface AssetRow {
  key: string;
  owner: string;
  code: string;
  category: "Недвижимость" | "Транспорт";
  title: string;
  detail: string;
  encumbrance?: string;
  /** Обременение — единственный признак риска, который есть у актива. */
  risk: RiskLevel;
}

function Assets({ people, companies }: { people: Person[]; companies: Company[] }) {
  const assets = useMemo<AssetRow[]>(() => {
    const out: AssetRow[] = [];
    const push = (owner: string, code: string, prefix: string, obj: Company | Person) => {
      (obj.realEstate ?? []).forEach((re, i) =>
        out.push({
          key: `${prefix}-re-${i}`,
          owner,
          code,
          category: "Недвижимость",
          title: re.type,
          detail: re.address ?? re.cadastral ?? "—",
          encumbrance: re.encumbrance,
          risk: re.encumbrance ? "medium" : "none",
        })
      );
      (obj.vehicles ?? []).forEach((v, i) =>
        out.push({
          key: `${prefix}-v-${i}`,
          owner,
          code,
          category: "Транспорт",
          title: v.model,
          detail: [v.plate, v.year].filter(Boolean).join(" · ") || "—",
          encumbrance: v.encumbrance,
          /* Арест — это уже не просто обременение, а взыскание. */
          risk: v.encumbrance ? (/[Аа]рест/.test(v.encumbrance) ? "high" : "medium") : "none",
        })
      );
    };
    for (const p of people) push(p.fullName, p.iin, `p${p.id}`, p);
    for (const c of companies) push(companyCase(c.name), c.bin, `c${c.id}`, c);
    return out;
  }, [people, companies]);

  const f = useRegistryFilter(assets, (r) => [r.owner, r.code, r.title, r.detail, r.encumbrance]);
  const encumbered = assets.filter((a) => a.encumbrance);

  const byCategory = (["Недвижимость", "Транспорт"] as const).map((cat) => ({
    key: cat,
    label: cat,
    value: assets.filter((a) => a.category === cat).length,
    display: `${assets.filter((a) => a.category === cat).length}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <Insight
          icon={Home}
          tone="neutral"
          title="Объектов на учёте"
          value={num(assets.length)}
          detail={`${assets.filter((a) => a.category === "Недвижимость").length} объектов недвижимости, ${
            assets.filter((a) => a.category === "Транспорт").length
          } транспортных средств`}
        />
        <Insight
          icon={AlertTriangle}
          tone={encumbered.length ? "warning" : "neutral"}
          title="С обременением"
          value={num(encumbered.length)}
          detail={`${percent((encumbered.length / Math.max(assets.length, 1)) * 100)} всех объектов — залог или арест`}
        />
        <Insight
          icon={Car}
          tone={assets.some((a) => a.risk === "high") ? "danger" : "neutral"}
          title="Под арестом"
          value={num(assets.filter((a) => a.risk === "high").length)}
          detail="арест наложен в рамках исполнительного производства"
        />
      </div>

      <SectionCard icon={Home} title="Структура активов" collapsible={false}>
        <ShareDonut
          items={byCategory.filter((i) => i.value > 0)}
          columns={["Категория", "Объектов"]}
        />
      </SectionCard>

      <RegistryToolbar
        term={f.term}
        onTerm={f.setTerm}
        risk={f.risk}
        onRisk={f.setRisk}
        counts={f.counts}
        placeholder="Владелец, объект, госномер или обременение"
      />
      <RegistryTable
        total={f.filtered.length}
        unit={["объект", "объекта", "объектов"]}
        empty={{ title: "Активы не найдены", description: "Измените запрос или фильтр." }}
        head={
          <>
            <TableHead>Владелец</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead>Объект</TableHead>
            <TableHead>Идентификация</TableHead>
            <TableHead>Обременение</TableHead>
          </>
        }
        rows={f.filtered.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="font-medium">{r.owner}</TableCell>
            <TableCell>
              <Badge tone={r.category === "Недвижимость" ? "teal" : "indigo"} size="sm">
                {r.category}
              </Badge>
            </TableCell>
            <TableCell>{r.title}</TableCell>
            <TableCell className="text-muted-foreground">{r.detail}</TableCell>
            <TableCell>
              {r.encumbrance ? (
                <span className={r.risk === "high" ? "text-danger" : "text-warning-foreground"}>
                  {r.encumbrance}
                </span>
              ) : (
                <span className="text-muted-foreground">нет</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

/* ---------------------------- Суды и штрафы ---------------------------- */

interface CaseRow {
  key: string;
  subject: string;
  kind: string;
  number: string;
  role: string;
  status: string;
  date: string;
  risk: RiskLevel;
}

interface FineRow {
  key: string;
  subject: string;
  reason: string;
  amount: number;
  date: string;
  paid: boolean;
  risk: RiskLevel;
}

/**
 * Открытым считается любое дело, кроме завершённого.
 *
 * Проверять на «на рассмотрении» недостаточно: «Розыск», «Исполнительное
 * производство» и «Признан банкротом» — тоже незакрытые статусы, и красить их
 * как историю значит прятать худшее из того, что есть.
 */
const openCase = (status?: string): RiskLevel =>
  status && !/заверш|прекращ|отказ/i.test(status) ? "medium" : "none";

function Courts({ people, companies }: { people: Person[]; companies: Company[] }) {
  const cases = useMemo<CaseRow[]>(
    () => [
      ...people.flatMap((p) =>
        (p.courtCases ?? []).map((c, i) => ({
          key: `p-${p.id}-${i}`,
          subject: p.fullName,
          kind: c.kind,
          number: c.number ?? "—",
          role: c.role ?? "—",
          status: c.status ?? "—",
          date: c.date ?? "—",
          risk: openCase(c.status),
        }))
      ),
      ...companies.flatMap((c) =>
        (c.courtCases ?? []).map((k, i) => ({
          key: `c-${c.id}-${i}`,
          subject: companyCase(c.name),
          kind: k.kind,
          number: k.number ?? "—",
          role: k.role ?? "—",
          status: k.status ?? "—",
          date: k.date ?? "—",
          risk: openCase(k.status),
        }))
      ),
    ],
    [people, companies]
  );

  const fines = useMemo<FineRow[]>(
    () => [
      ...people.flatMap((p) =>
        (p.fines ?? []).map((f, i) => ({
          key: `p-${p.id}-${i}`,
          subject: p.fullName,
          reason: f.reason,
          amount: f.amount,
          date: f.date ?? "—",
          paid: f.paid ?? false,
          risk: (f.paid ? "none" : "medium") as RiskLevel,
        }))
      ),
      ...companies.flatMap((c) =>
        (c.fines ?? []).map((f, i) => ({
          key: `c-${c.id}-${i}`,
          subject: companyCase(c.name),
          reason: f.reason,
          amount: f.amount,
          date: f.date ?? "—",
          paid: f.paid ?? false,
          risk: (f.paid ? "none" : "medium") as RiskLevel,
        }))
      ),
    ],
    [people, companies]
  );

  const fc = useRegistryFilter(cases, (r) => [r.subject, r.kind, r.number, r.role, r.status]);
  const ff = useRegistryFilter(fines, (r) => [r.subject, r.reason, r.date]);
  const unpaid = fines.filter((f) => !f.paid);
  const finesTotal = fines.reduce((s, f) => s + f.amount, 0);
  const unpaidShare = (unpaid.reduce((s, f) => s + f.amount, 0) / Math.max(finesTotal, 1)) * 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 lg:grid-cols-3">
        <Insight
          icon={Gavel}
          tone="neutral"
          title="Судебных дел"
          value={num(cases.length)}
          detail={`${cases.filter((c) => c.risk !== "none").length} не закрыто`}
        />
        <Insight
          icon={Receipt}
          tone={unpaid.length ? "danger" : "neutral"}
          title="Неоплаченные штрафы"
          value={money(unpaid.reduce((s, f) => s + f.amount, 0))}
          detail={`${unpaid.length} из ${fines.length} постановлений`}
        />
        <Insight
          icon={AlertTriangle}
          tone={unpaidShare > 50 ? "danger" : "warning"}
          title="Доля неоплаченного"
          value={percent(unpaidShare)}
          detail={`из ${money(finesTotal)} наложенных штрафов`}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Судебные дела</h3>
        <RegistryToolbar
          term={fc.term}
          onTerm={fc.setTerm}
          risk={fc.risk}
          onRisk={fc.setRisk}
          counts={fc.counts}
          placeholder="Субъект, номер дела, роль или статус"
        />
        <RegistryTable
          total={fc.filtered.length}
          unit={["дело", "дела", "дел"]}
          empty={{ title: "Дела не найдены", description: "Измените запрос или фильтр." }}
          head={
            <>
              <TableHead>Субъект</TableHead>
              <TableHead>Вид</TableHead>
              <TableHead>Номер</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
            </>
          }
          rows={fc.filtered.map((r) => (
            <TableRow key={r.key}>
              <TableCell className="font-medium">{r.subject}</TableCell>
              <TableCell>{r.kind}</TableCell>
              <TableCell className="tabular-nums">{r.number}</TableCell>
              <TableCell>{r.role}</TableCell>
              <TableCell>
                <Badge tone={r.risk === "none" ? "outline" : "warning"} size="sm">
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums">{r.date}</TableCell>
            </TableRow>
          ))}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Штрафы</h3>
        <RegistryToolbar
          term={ff.term}
          onTerm={ff.setTerm}
          risk={ff.risk}
          onRisk={ff.setRisk}
          counts={ff.counts}
          placeholder="Субъект или основание"
        />
        <RegistryTable
          total={ff.filtered.length}
          unit={["постановление", "постановления", "постановлений"]}
          empty={{ title: "Штрафы не найдены", description: "Измените запрос или фильтр." }}
          head={
            <>
              <TableHead>Субъект</TableHead>
              <TableHead>Основание</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead numeric>Сумма</TableHead>
              <TableHead>Оплата</TableHead>
            </>
          }
          rows={ff.filtered.map((r) => (
            <TableRow key={r.key}>
              <TableCell className="font-medium">{r.subject}</TableCell>
              <TableCell>{r.reason}</TableCell>
              <TableCell className="tabular-nums">{r.date}</TableCell>
              <TableCell numeric>{money(r.amount)}</TableCell>
              <TableCell>
                <Badge tone={r.paid ? "success" : "danger"} size="sm">
                  {r.paid ? "Оплачен" : "Не оплачен"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        />
      </div>
    </div>
  );
}
