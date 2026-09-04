import { Suspense } from "react";

import { EsfModule } from "@/components/modules/esf-module";

/**
 * Модуль ЭСФ. Вход — посадочный поиск, как в прежней версии; запрос живёт в
 * адресе (?q=…), полный реестр открывается через ?all=1.
 */
export default function EsfPage() {
  return (
    <Suspense>
      <EsfModule />
    </Suspense>
  );
}
