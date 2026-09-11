/**
 * Реальность хозяйственной деятельности организации.
 *
 * Раздел 13 концепции: высокий оборот при минимальном штате, отсутствие
 * активов под заявленный вид деятельности, налоговая нагрузка ниже
 * сопоставимых, продажи, не подтверждённые закупом. По отдельности каждый
 * признак объясним; вместе они описывают организацию, через которую деньги
 * проходят, а деятельность не ведётся.
 *
 * Сравнение — с остальными организациями базы, а не с зашитым порогом.
 * «Ниже сопоставимых» в концепции сказано именно так, и порог, взятый из
 * головы, назавтра оказывается неверным для другой отрасли.
 */

import { counted, money, percent } from "@/lib/format";
import { bySeverity, type RiskFinding } from "@/lib/findings";
import type { Company } from "@/data/types";

/** Виды деятельности, которым нужны склад и транспорт: ОКЭД по классам. */
const NEEDS_ASSETS = new Set([
  41, 42, 43, // строительство
  45, 46, 47, // торговля
  49, 50, 51, 52, 53, // перевозки и склад
  10, 11, 20, 22, 23, 24, 25, // производство
]);

/** «Оптовая торговля (46900)» → 46. */
function okedClass(activity?: string): number | null {
  const m = /\((\d{2})\d*\)/.exec(activity ?? "");
  return m ? Number(m[1]) : null;
}

interface Finance {
  revenue?: number;
  expenses?: number;
  taxes?: number;
  turnover?: number;
  fot?: number;
  trend?: number[];
  esf?: {
    atypicalRealizationTRU?: string[];
    atypicalAcquisitionTRU?: string[];
  };
}

const fin = (c: Company): Finance => (c.finance ?? {}) as Finance;

/** Налоговая нагрузка: доля налогов в обороте. */
function burdenOf(c: Company): number | null {
  const f = fin(c);
  if (!f.turnover || f.taxes == null) return null;
  return f.taxes / f.turnover;
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Признаки, которые прямо называют схему, а не просто несоответствие. */
const SCHEME = /лжепредприят|обналич|без фактическ|мнимы|бестоварн/i;

export function companyRisks(company: Company, all: Company[]): RiskFinding[] {
  const out: RiskFinding[] = [];
  const f = fin(company);
  const turnover = f.turnover ?? 0;

  /* ---------------- Налоговая нагрузка ниже сопоставимых ---------------- */
  const own = burdenOf(company);
  const peers = all
    .filter((c) => c.bin !== company.bin)
    .map(burdenOf)
    .filter((b): b is number => b != null);

  if (own != null && peers.length > 0 && turnover >= 1e9) {
    const peerMedian = median(peers);
    /* Втрое ниже медианы — иначе обычный разброс между отраслями попадал бы
       в находки и приучал бы их пролистывать. */
    if (peerMedian > 0 && own < peerMedian / 3) {
      out.push({
        id: "tax-burden",
        title:
          f.taxes === 0
            ? "Налоги не уплачивались при действующем обороте"
            : "Налоговая нагрузка кратно ниже сопоставимых организаций",
        severity: "high",
        evidence: [
          `Нагрузка ${percent(own * 100)} при обороте ${money(turnover)}: уплачено ${money(f.taxes ?? 0)}`,
          `У остальных организаций базы — ${percent(peerMedian * 100)} по медиане`,
          ...(company.taxpayerRisk ? [`Степень риска налогоплательщика: ${company.taxpayerRisk}`] : []),
        ],
        link: { label: "Открыть финансы и налоги", href: `/company/${company.bin}` },
      });
    }
  }

  /* ------------------ Оборот без регистрации по НДС ------------------ */
  if (company.vatPayer === false && turnover >= 1e8) {
    out.push({
      id: "no-vat",
      title: "Оборот при отсутствии регистрации по НДС",
      severity: "high",
      evidence: [
        `Оборот ${money(turnover)} — организация не состоит на учёте как плательщик НДС`,
        "Оборот такого размера подлежит обязательной постановке на учёт; расхождение проверяется по данным КГД",
      ],
    });
  }

  /* --------------- Задолженность сопоставима с оборотом --------------- */
  const enforcement = (company.enforcementDebt as { total?: number } | undefined)?.total ?? 0;
  const debt = (company.taxDebt ?? 0) + (company.customsDebt ?? 0) + enforcement;
  if (debt > 0 && turnover > 0) {
    const share = debt / turnover;
    if (share >= 0.05) {
      out.push({
        id: "debt-vs-turnover",
        title: "Задолженность сопоставима с оборотом",
        severity: share >= 0.2 ? "high" : "medium",
        evidence: [
          `Совокупный долг ${money(debt)} — ${percent(share * 100)} годового оборота`,
          [
            company.taxDebt ? `налоговая задолженность ${money(company.taxDebt)}` : null,
            company.customsDebt ? `таможенная ${money(company.customsDebt)}` : null,
            enforcement ? `исполнительное производство ${money(enforcement)}` : null,
          ]
            .filter(Boolean)
            .join("; "),
        ],
      });
    }
  }

  /* ------- Оборот кратно выше выручки при расходах выше доходов ------- */
  if (f.revenue && f.expenses && turnover > f.revenue * 2 && f.expenses > f.revenue) {
    out.push({
      id: "turnover-vs-revenue",
      title: "Оборот по счетам-фактурам кратно превышает выручку",
      severity: "high",
      evidence: [
        `Оборот ${money(turnover)} против выручки ${money(f.revenue)} — превышение в ${(turnover / f.revenue)
          .toFixed(1)
          .replace(".", ",")} раза`,
        `При этом расходы ${money(f.expenses)} выше доходов: деятельность убыточна, а средства через организацию проходят`,
      ],
      link: { label: "Открыть ЭСФ организации", href: `/esf/${company.bin}` },
    });
  }

  /* ---------- Нет активов под заявленный вид деятельности ---------- */
  const cls = okedClass(company.activityType);
  const assets = (company.realEstate?.length ?? 0) + (company.vehicles?.length ?? 0);
  if (cls != null && NEEDS_ASSETS.has(cls) && turnover >= 1e9 && assets <= 2) {
    out.push({
      id: "no-assets",
      title: "Нет активов под заявленный вид деятельности",
      severity: "medium",
      evidence: [
        `${company.activityType} с оборотом ${money(turnover)}`,
        `На учёте ${counted(company.realEstate?.length ?? 0, "объект", "объекта", "объектов")} недвижимости и ${counted(
          company.vehicles?.length ?? 0,
          "единица",
          "единицы",
          "единиц"
        )} транспорта — склады и перевозка не подтверждаются`,
        ...(company.employees
          ? [`Штат — ${counted(company.employees, "человек", "человека", "человек")}`]
          : []),
      ],
    });
  }

  /* --------------------- Нетипичные товары и услуги --------------------- */
  const atypical = [
    ...(f.esf?.atypicalRealizationTRU ?? []).map((t) => ({ side: "Реализация", text: t })),
    ...(f.esf?.atypicalAcquisitionTRU ?? []).map((t) => ({ side: "Приобретение", text: t })),
  ];
  if (atypical.length > 0) {
    const scheme = atypical.some((a) => SCHEME.test(a.text));
    out.push({
      id: "atypical-tru",
      title: scheme
        ? "Сделки с признаками отсутствия реального исполнения"
        : "Товары и услуги, не соответствующие виду деятельности",
      severity: scheme ? "high" : "medium",
      evidence: atypical.map((a) => `${a.side}: ${a.text}`),
      link: { label: "Открыть ЭСФ организации", href: `/esf/${company.bin}` },
    });
  }

  /* ------------------- Первый руководитель под следствием ------------------- */
  const wanted = company.execWanted as { article?: string; initiator?: string } | undefined;
  const convicted = company.execCriminalRecord as
    | { article?: string; punishment?: string }
    | undefined;
  if (wanted || convicted) {
    out.push({
      id: "exec-criminal",
      title: "Первый руководитель в розыске или судим",
      severity: "high",
      evidence: [
        ...(wanted
          ? [`Розыск: ${wanted.article ?? "—"}${wanted.initiator ? `, инициатор — ${wanted.initiator}` : ""}`]
          : []),
        ...(convicted
          ? [`Судимость: ${convicted.article ?? "—"}${convicted.punishment ? `, ${convicted.punishment}` : ""}`]
          : []),
        ...(company.manager?.name ? [`Руководитель: ${company.manager.name}`] : []),
      ],
    });
  }

  /* ------------- Оборот падает, задолженность накапливается ------------- */
  const trend = f.trend ?? [];
  if (trend.length >= 3 && debt > 0) {
    const first = trend[0];
    const last = trend[trend.length - 1];
    if (first > 0 && last < first * 0.5) {
      out.push({
        id: "declining",
        title: "Оборот падает при растущей задолженности",
        severity: "medium",
        evidence: [
          `Оборот по годам: ${trend.join(" → ")} — снижение на ${percent(((first - last) / first) * 100)}`,
          `Непогашенная задолженность на конец периода — ${money(debt)}`,
        ],
      });
    }
  }

  return out.sort(bySeverity);
}
