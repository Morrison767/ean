/**
 * Коррупционные риски по трудовой биографии.
 *
 * Сама по себе биография антикору не нужна: сколько человек отработал и где
 * задержался — вопрос кадровика. Значение она получает в связке с другими
 * реестрами: кем он руководил, кому эта организация поставляла, есть ли у
 * него выход на заказчика и не запрещено ли ему было всё это совмещать.
 * Здесь и собираются такие связки — по одному правилу на находку.
 *
 * Каждая находка обязана называть проверяемые факты и место, куда пойти
 * сверять. «Признаки аффилированности» без ссылки на закупку — это мнение, а
 * аналитик работает с доказательствами.
 */

import { RISK_TAG_FULL } from "@/config/dashboard";
import { bySeverity, type RiskFinding } from "@/lib/findings";
import { money } from "@/lib/format";
import { parseDate, periodOf } from "@/lib/employment";
import type { Database } from "@/data/seed";
import type { Company, Employment, Person } from "@/data/types";

/** Находка по занятости — общий вид с остальными разборами, плюс обязательная
    привязка к записям: их подсвечивают прямо в ленте. */
export type EmploymentRisk = RiskFinding & { records: string[] };

/** Ключ записи в ленте — тот же, что и в разметке. */
export const recordKey = (r: Employment): string => `${r.contract ?? r.company}-${r.start}`;

const LEADER = /руководител|директор|председател/i;
const isLeader = (r: Employment) => r.nkz === "1120" || LEADER.test(r.position);

/** Сопоставление названий организаций: кавычки и форма собственности мешают. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[«»"']/g, "")
    /* Не через : границу слова JS считает по [A-Za-z0-9_], и у кириллицы
       её нет — «тоо » так никогда не отрезалось бы. */
    .replace(/(^|\s)(тоо|ао|ип|гу|гкп|ргп)(?=\s)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/** Пересекаются ли строки как названия органов: «Акимат г. Астана» в «Управление госзакупок акимата г. Астана». */
function sameBody(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (x === y) return true;
  /* Акимат конкретного города — достаточно совпадения города. */
  const city = /(астан|алмат|шымкент|караганд|актау|актоб)/.exec(x)?.[1];
  if (city && /акимат/.test(x) && /акимат/.test(y) && y.includes(city)) return true;
  return x.length > 8 && (y.includes(x) || x.includes(y));
}

function within(record: Employment, date?: string): boolean {
  const p = periodOf(record);
  const d = parseDate(date);
  if (!p || !d) return false;
  return d >= p.from && d <= p.to;
}

export function employmentRisks(person: Person, db: Database): EmploymentRisk[] {
  const records = person.employment ?? [];
  if (records.length === 0) return [];

  const out: EmploymentRisk[] = [];
  const company = (bin?: string, name?: string): Company | undefined =>
    db.companies.find((c) => (bin && c.bin === bin) || (name && norm(c.name) === norm(name)));

  /* Органы, где у субъекта есть свой человек: родственники и контакты. */
  const insiders = [
    ...((person.govConnections?.links as Array<Record<string, string>> | undefined) ?? []),
    ...(person.connections ?? []).map((c) => ({
      name: c.name,
      body: (c as unknown as { organ?: string }).organ,
      position: (c as unknown as { role?: string }).role,
      relation: c.relation,
      risk: c.risk,
      riskReason: (c as unknown as { riskReason?: string }).riskReason,
    })),
  ].filter((l) => l.body && l.body !== "—");

  /* ---------------- Руководил поставщиком по госзакупкам ---------------- */
  for (const r of records) {
    if (!isLeader(r) || !r.bin) continue;
    const won = db.procurements.filter((p) => p.winnerBin === r.bin && within(r, p.date));
    if (won.length === 0) continue;

    const total = won.reduce((s, p) => s + p.contractAmount, 0);
    const flagged = won.filter((p) => p.risk !== "none");
    const single = won.filter((p) => p.participants === 1);
    const evidence = [
      `${r.company} выиграла ${won.length} закупок на ${money(total)}, пока субъект занимал должность «${r.position}»`,
    ];
    if (single.length) {
      evidence.push(
        `${single.length} из них — с единственным участником: ${single
          .map((p) => `${p.customer}, ${money(p.contractAmount)}`)
          .join("; ")}`
      );
    }
    const flags = [...new Set(flagged.flatMap((p) => p.flags ?? []))];
    if (flags.length) evidence.push(`Отметки в реестре закупок: ${flags.join("; ")}`);

    out.push({
      id: `procurement-${r.bin}`,
      title: "Руководил поставщиком по государственным закупкам",
      severity: flagged.length ? "high" : "medium",
      evidence,
      link: { label: "Открыть в закупках", href: `/procurement?focus=${r.bin}` },
      records: [recordKey(r)],
    });

    /* --------- Заказчик тот же, где у субъекта есть свой человек --------- */
    for (const p of won) {
      const inside = insiders.find((l) => sameBody(l.body as string, p.customer));
      if (!inside) continue;
      out.push({
        id: `insider-${p.id}`,
        title: "Заказчик — орган, где у субъекта есть личная связь",
        severity: "high",
        evidence: [
          `${r.company} получила контракт «${p.subject}» от заказчика ${p.customer} на ${money(p.contractAmount)}`,
          `${inside.name} — ${inside.position ?? "должностное лицо"}, ${inside.body}; отношение к субъекту: ${
            inside.relation ?? "связь"
          }`,
          ...(inside.riskReason ? [`Отмечено: ${inside.riskReason}`] : []),
        ],
        link: { label: "Открыть в закупках", href: `/procurement?focus=${r.bin}` },
        records: [recordKey(r)],
      });
    }
  }

  /* ------------- Аффилированность руководителя по ГБД ЮЛ ------------- */
  for (const r of records) {
    const c = company(r.bin, r.company);
    if (!c?.manager?.affiliated) continue;
    if (c.manager.iin !== person.iin) continue;
    out.push({
      id: `affiliated-${c.bin}`,
      title: "Руководитель отмечен как аффилированный",
      severity: "high",
      evidence: [
        `В ГБД ЮЛ по ${c.name} субъект указан руководителем с ${c.manager.appointedAt ?? "—"} и помечен как аффилированное лицо`,
        ...(c.riskTags?.filter((t) => String(t) !== "none").length
          ? [
              `Признаки организации: ${c
                .riskTags!.filter((t) => String(t) !== "none")
                .map((t) => RISK_TAG_FULL[t] ?? t)
                .join(", ")}`,
            ]
          : []),
      ],
      link: { label: "Открыть досье организации", href: `/company/${c.bin}` },
      records: [recordKey(r)],
    });
  }

  /* ------ Совместительство и предпринимательство при связях с властью ------ */
  const gov = person.govConnections as Record<string, string> | undefined;
  const govLevel = gov?.level;
  if (govLevel && govLevel !== "none") {
    const parallel = records.filter((r) => !r.end && r.kind !== "participation");
    const business = records.filter((r) => r.kind === "entrepreneur" || r.ownership);
    if (parallel.length > 1 || business.length > 0) {
      const evidence: string[] = [];
      if (parallel.length > 1) {
        evidence.push(
          `Одновременно действуют ${parallel.length} договора: ${parallel
            .map((r) => `${r.company} — ${r.position}`)
            .join("; ")}`
        );
      }
      if (business.length) {
        evidence.push(
          `Предпринимательство и доли: ${business
            .map((r) => `${r.company}${r.ownership ? ` (${r.ownership})` : ""}`)
            .join("; ")}`
        );
      }
      evidence.push(
        `Связи с госорганами: ${gov?.relatives ?? "—"}${gov?.bodies && gov.bodies !== "—" ? ` (${gov.bodies})` : ""}`
      );
      out.push({
        id: "concurrent-gov",
        title: "Совмещение и предпринимательство при связях с госорганами",
        severity: govLevel === "found" ? "high" : "medium",
        evidence,
        records: [...parallel, ...business].map(recordKey),
      });
    }
  }

  /* ----------------- Уход с госслужбы к поставщику органа ----------------- */
  const service = records.filter((r) => r.publicService && r.end);
  for (const s of service) {
    const left = parseDate(s.end);
    for (const r of records) {
      if (r === s || !r.bin) continue;
      const after = parseDate(r.start);
      if (!left || !after || after < left) continue;
      const supplied = db.procurements.filter(
        (p) => p.winnerBin === r.bin && sameBody(s.company, p.customer) && within(r, p.date)
      );
      if (supplied.length === 0) continue;
      out.push({
        id: `revolving-${r.bin}`,
        title: "Переход с госслужбы к поставщику того же органа",
        severity: "high",
        evidence: [
          `До ${s.end} работал в ${s.company} — должность «${s.position}»`,
          `С ${r.start} — «${r.position}» в ${r.company}`,
          `${r.company} получила от ${s.company} ${supplied.length} контрактов на ${money(
            supplied.reduce((x, p) => x + p.contractAmount, 0)
          )}`,
        ],
        link: { label: "Открыть в закупках", href: `/procurement?focus=${r.bin}` },
        records: [recordKey(s), recordKey(r)],
      });
    }
  }

  /* ------------------ Увольнение по отрицательным мотивам ------------------ */
  /* [а-яё], а не \w: \w в JS это [A-Za-z0-9_], и «утрата доверия» так не
     находилась — основание увольнения проходило мимо проверки. */
  const NEGATIVE = /утрат[а-яё]* доверия|коррупцион|виновн[а-яё]* действ/i;
  const negative = records.filter((r) => NEGATIVE.test(r.dismissal ?? ""));
  if (negative.length) {
    out.push({
      id: "negative-dismissal",
      title: "Увольнение по отрицательным мотивам",
      severity: "high",
      evidence: negative.map((r) => `${r.company}, ${r.end}: ${r.dismissal}`),
      records: negative.map(recordKey),
    });
  }

  /* -------------- Руководство банкротами и ликвидированными -------------- */
  /* Приостановленное ИП сюда не входит: приостановка это уведомительная
     процедура, а не крах организации, и ставить её рядом с банкротством
     значит выдавать обычное действие за находку. */
  const failedStatus = /банкрот|ликвидир/i;
  const failed = records.filter((r) => {
    const c = company(r.bin, r.company);
    const byBusiness = (person.businesses ?? []).find(
      (b) => norm(String(b.name ?? "")) === norm(r.company)
    );
    return (
      failedStatus.test(r.status ?? "") ||
      failedStatus.test(String(byBusiness?.status ?? "")) ||
      !!c?.riskTags?.includes("bankrupt")
    );
  });
  if (failed.length) {
    out.push({
      id: "failed-companies",
      title:
        failed.length > 1
          ? "Руководство несколькими организациями, прекратившими существование"
          : "Руководство организацией, прекратившей существование",
      severity: failed.length > 1 ? "high" : "medium",
      evidence: failed.map((r) => {
        const byBusiness = (person.businesses ?? []).find(
          (b) => norm(String(b.name ?? "")) === norm(r.company)
        );
        const state = r.status ?? byBusiness?.status ?? "прекращена";
        return `${r.company} — ${String(state).toLowerCase()}; роль субъекта: ${r.ownership ?? r.position}`;
      }),
      records: failed.map(recordKey),
    });
  }

  /* ------------------ Работодатель с признаками риска ------------------ */
  const risky = records
    .map((r) => ({ r, c: company(r.bin, r.company) }))
    .filter((x) => x.c && x.c.riskLevel !== "none");
  if (risky.length) {
    const seen = new Set<string>();
    const unique = risky.filter((x) => !seen.has(x.c!.bin) && seen.add(x.c!.bin));
    out.push({
      id: "risky-employer",
      title: "Работодатель с признаками риска",
      severity: unique.some((x) => x.c!.riskLevel === "high") ? "high" : "medium",
      evidence: unique.map(
        (x) =>
          `${x.c!.name} — балл ${x.c!.score}/100${
            x.c!.taxDebt ? `, налоговая задолженность ${money(x.c!.taxDebt)}` : ""
          }`
      ),
      records: risky.map((x) => recordKey(x.r)),
    });
  }

  return out.sort(bySeverity);
}
