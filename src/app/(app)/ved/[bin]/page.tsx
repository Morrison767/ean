/** Маршрут профиля участника ВЭД. Серверная обёртка — ради generateStaticParams. */

import { VedParticipantPage } from "@/components/modules/ved-participant-route";
import declarations from "@/data/seed/declarations.json";

export function generateStaticParams() {
  return [...new Set(declarations.map((d) => d.bin))].map((bin) => ({ bin }));
}

export default function Page() {
  return <VedParticipantPage />;
}
