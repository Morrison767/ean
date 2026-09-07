import { Suspense } from "react";

import { VedModule } from "@/components/modules/ved-module";

/** Модуль ВЭД: вход — посадочный поиск, полный реестр по ?all=1. */
export default function VedPage() {
  return (
    <Suspense>
      <VedModule />
    </Suspense>
  );
}
