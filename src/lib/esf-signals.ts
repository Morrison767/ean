/**
 * Признаки риска контрагента в ЭСФ — перенос правил из прежней версии.
 *
 * Шесть проверок, каждая со своей формулировкой. Правила выведены из
 * оригинального кода и повторены дословно: аналитик читает не «риск высокий»,
 * а «завышение цены на 48 % по такой-то позиции, переплата столько-то», и
 * именно эта фраза — результат работы модуля.
 */

import { money, moneyFull, num, percent } from "@/lib/format";
import type { Company, Invoice, SchemeGraph } from "@/data/types";

export type Severity = "high" | "medium";

export interface SignalItem {
  note: string;
  fields?: Array<{ label: string; value: string }>;
}

export interface Signal {
  key: string;
  label: string;
  severity: Severity;
  items: SignalItem[];
}

/** Отклонение цены сделки от рыночной, в процентах. */
const deviation = (i: Invoice): number =>
  i.avgPrice && i.avgPrice > 0 ? ((i.price - i.avgPrice) / i.avgPrice) * 100 : 0;

export function buildEsfSignals({
  bin,
  invoices,
  company,
  companies,
  schemes,
}: {
  bin: string;
  /** Счета-фактуры субъекта за выбранный период. */
  invoices: Invoice[];
  company?: Company;
  companies: Company[];
  schemes: SchemeGraph[];
}): Signal[] {
  /* 1. Ценовые аномалии: отклонение от рынка от 15 %. */
  const price: SignalItem[] = invoices
    .filter((i) => Math.abs(deviation(i)) >= 15)
    .map((i) => {
      const pct = Math.round(deviation(i));
      const up = pct > 0;
      const overpay = Math.round((i.price - (i.avgPrice ?? 0)) * i.qty);
      const side =
        i.supplierBin === bin ? `(покупатель «${i.customer}»)` : `(поставщик «${i.supplier}»)`;
      return {
        note:
          `${up ? "Завышение" : "Занижение"} цены на ${Math.abs(pct)}% по «${i.product}» ${side}` +
          (up ? `. Сумма переплаты: ${money(Math.abs(overpay))}` : ""),
        fields: [
          { label: "№ ЭСФ", value: i.id },
          { label: "Дата", value: i.date },
          { label: "Цена сделки", value: moneyFull(i.price) },
          { label: "Рыночная цена", value: i.avgPrice ? moneyFull(i.avgPrice) : "—" },
          { label: "Количество", value: `${num(i.qty)} ${i.unit ?? ""}`.trim() },
          { label: "Сумма", value: moneyFull(i.amount) },
        ],
      };
    });

  /* 2. Токсичные контрагенты: вторая сторона — компания с высоким риском. */
  const seen = new Set<string>();
  const toxic: SignalItem[] = [];
  for (const i of invoices) {
    const otherBin = i.supplierBin === bin ? i.customerBin : i.supplierBin;
    const otherName = i.supplierBin === bin ? i.customer : i.supplier;
    const other = companies.find((c) => c.bin === otherBin);
    if (other?.riskLevel === "high" && !seen.has(otherBin)) {
      seen.add(otherBin);
      toxic.push({
        note: `Сделка с «${otherName}» — высокий риск / признаки лжепредприятия.`,
        fields: [
          { label: "Контрагент", value: otherName },
          { label: "БИН", value: otherBin },
          { label: "Сумма", value: moneyFull(i.amount) },
        ],
      });
    }
  }

  /* 3. Транзит: субъект в цепочке поставок с помеченными переходами.
     Смотрим только этот набор — в прежней версии проверка обращалась
     ровно к нему, а не ко всем схемам сразу. */
  const transit: SignalItem[] = schemes
    .filter(
      (s) =>
        s.group === "supply" &&
        s.nodes?.some((n) => n.bin === bin) &&
        s.edges?.some((e) => e.flag)
    )
    .map((s) => ({
      note: `${s.title}: ${s.notes?.[0] ?? "товар перепродаётся по цепочке без добавленной стоимости."}`,
    }));

  /* 4. Скрытая аффилированность руководителя. */
  const affiliated: SignalItem[] = company?.manager?.affiliated
    ? [
        {
          note: `Руководитель «${company.manager.name}» аффилирован с контрагентами по сделкам (общие учредители / юридический адрес / связанные лица).`,
        },
      ]
    : [];

  /* 5. Повтор однотипных сделок: два и более с одним контрагентом. */
  const byPartner = new Map<string, { n: number; name: string }>();
  for (const i of invoices) {
    const otherBin = i.supplierBin === bin ? i.customerBin : i.supplierBin;
    const otherName = i.supplierBin === bin ? i.customer : i.supplier;
    const prev = byPartner.get(otherBin) ?? { n: 0, name: otherName };
    prev.n += 1;
    byPartner.set(otherBin, prev);
  }
  const repeat: SignalItem[] = [...byPartner.values()]
    .filter((x) => x.n >= 2)
    .map((x) => ({
      note: `${x.n} однотипных сделок с «${x.name}» за период — возможное искусственное дробление сумм для обхода процедур.`,
    }));

  /* 6. Массовый отзыв: доля аннулированных выше 10 % при трёх и более ЭСФ. */
  const cancelled = invoices.filter((i) => /аннулир|отклон/i.test(i.status ?? "")).length;
  const cancel: SignalItem[] =
    invoices.length >= 3 && cancelled / invoices.length > 0.1
      ? [
          {
            note: `Аномально высокая доля аннулированных/отозванных счетов-фактур — ${percent(
              (cancelled / invoices.length) * 100
            )} оборота (${cancelled} из ${invoices.length}).`,
          },
        ]
      : [];

  return [
    { key: "price", label: "Ценовые аномалии (завышение/занижение)", severity: "high", items: price },
    { key: "toxic", label: "Сделки с токсичными контрагентами", severity: "high", items: toxic },
    { key: "transit", label: "Транзитные схемы («прокладки»)", severity: "high", items: transit },
    { key: "affil", label: "Скрытая аффилированность", severity: "medium", items: affiliated },
    { key: "repeat", label: "Аномальный повтор сделок", severity: "medium", items: repeat },
    { key: "cancel", label: "Массовый отзыв / аннулирование ЭСФ", severity: "medium", items: cancel },
  ];
}
