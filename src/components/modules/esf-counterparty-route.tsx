"use client";

/** Экран профиля контрагента ЭСФ: подбирает данные и отдаёт их в EsfProfile. */

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Building2 } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { buildCounterparties } from "@/components/modules/esf-module";
import { EsfProfile } from "@/components/modules/esf-profile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/store/use-app";

export function EsfCounterpartyPage() {
  const params = useParams<{ bin: string }>();
  const hydrated = useApp((s) => s.hydrated);
  const db = useApp((s) => s.db);

  const cp = useMemo(
    () => buildCounterparties(db.invoices).find((c) => c.bin === params.bin),
    [db.invoices, params.bin]
  );

  const invoices = useMemo(
    () => db.invoices.filter((i) => i.supplierBin === params.bin || i.customerBin === params.bin),
    [db.invoices, params.bin]
  );

  const company = db.companies.find((c) => c.bin === params.bin);

  if (!hydrated) {
    return (
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-10 rounded-12" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (!cp) {
    return (
      <Screen>
        <EmptyState
          icon={Building2}
          title="Контрагент не найден"
          description="В реестре ЭСФ нет организации с таким БИН."
          action={
            <Button variant="secondary" onClick={() => history.back()}>
              Вернуться назад
            </Button>
          }
        />
      </Screen>
    );
  }

  return <EsfProfile cp={cp} invoices={invoices} company={company} schemes={db.schemes} />;
}
