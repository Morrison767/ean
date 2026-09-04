/**
 * Маршрут профиля контрагента ЭСФ.
 *
 * Серверная обёртка нужна только ради generateStaticParams: статический
 * экспорт должен знать все БИН заранее. Сама страница клиентская — данные
 * лежат в localStorage.
 */

import { EsfCounterpartyPage } from "@/components/modules/esf-counterparty-route";
import invoices from "@/data/seed/invoices.json";

export function generateStaticParams() {
  /* Контрагент — это любая сторона счёта-фактуры: и поставщик, и покупатель. */
  const bins = new Set<string>();
  for (const inv of invoices) {
    bins.add(inv.supplierBin);
    bins.add(inv.customerBin);
  }
  return [...bins].map((bin) => ({ bin }));
}

export default function Page() {
  return <EsfCounterpartyPage />;
}
