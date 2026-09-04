"use client";

/**
 * Досье физлица по адресу /person/:id.
 *
 * Данные лежат в localStorage, поэтому страница клиентская: серверу их взять
 * неоткуда. Пока стор не поднят, показываем скелетон — иначе на первом кадре
 * субъект «не найден», и экран мигает ошибкой.
 */

import { Suspense, useEffect } from "react";
import { useParams } from "next/navigation";
import { UserX } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { PersonDossier } from "@/components/dossier/person-dossier";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { findPerson, useApp } from "@/store/use-app";

export function PersonPage() {
  return (
    <Suspense fallback={<DossierSkeleton />}>
      <PersonRoute />
    </Suspense>
  );
}

function PersonRoute() {
  const params = useParams<{ id: string }>();
  const hydrated = useApp((s) => s.hydrated);
  const db = useApp((s) => s.db);
  const log = useApp((s) => s.log);

  const person = findPerson(db, params.id);

  /* Просмотр досье — событие для журнала: система обязана знать, кто кого смотрел. */
  useEffect(() => {
    if (!hydrated || !person) return;
    log({
      action: "view_profile",
      subject: person.fullName,
      subjectType: "person",
      ip: "10.0.1.12",
      status: "success",
    });
    // Только при смене субъекта: log меняет базу и в зависимостях зациклил бы эффект.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, person?.id]);

  if (!hydrated) return <DossierSkeleton />;

  if (!person) {
    return (
      <Screen>
        <EmptyState
          icon={UserX}
          title="Субъект не найден"
          description="Досье с таким идентификатором отсутствует в базе."
          action={
            <Button variant="secondary" onClick={() => history.back()}>
              Вернуться назад
            </Button>
          }
        />
      </Screen>
    );
  }

  return <PersonDossier person={person} checklist={db.checklists.person} />;
}

function DossierSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-6 p-4 sm:p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Skeleton className="h-[520px] rounded-2xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 rounded-12" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
