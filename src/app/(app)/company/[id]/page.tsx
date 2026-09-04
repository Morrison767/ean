/** Маршрут досье юрлица. Устройство — как у /person/[id]. */

import { CompanyPage } from "@/components/dossier/company-route";
import companies from "@/data/seed/companies.json";

export function generateStaticParams() {
  return companies.map((c) => ({ id: c.id }));
}

export default function Page() {
  return <CompanyPage />;
}
