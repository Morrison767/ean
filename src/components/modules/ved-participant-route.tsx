"use client";

/** Экран профиля участника ВЭД: подбирает данные и отдаёт их в VedProfile. */

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Building2 } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { buildParticipants } from "@/components/modules/ved-module";
import { VedProfile } from "@/components/modules/ved-profile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/store/use-app";

export function VedParticipantPage() {
  const params = useParams<{ bin: string }>();
  const hydrated = useApp((s) => s.hydrated);
  const db = useApp((s) => s.db);

  const participant = useMemo(
    () => buildParticipants(db.declarations, db.companies).find((p) => p.bin === params.bin),
    [db.declarations, db.companies, params.bin]
  );

  const declarations = useMemo(
    () => db.declarations.filter((d) => d.bin === params.bin),
    [db.declarations, params.bin]
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

  if (!participant) {
    return (
      <Screen>
        <EmptyState
          icon={Building2}
          title="Участник не найден"
          description="В реестре ВЭД нет компании с таким БИН."
          action={
            <Button variant="secondary" onClick={() => history.back()}>
              Вернуться назад
            </Button>
          }
        />
      </Screen>
    );
  }

  return (
    <VedProfile
      participant={participant}
      declarations={declarations}
      company={company}
      schemes={db.schemes}
    />
  );
}
