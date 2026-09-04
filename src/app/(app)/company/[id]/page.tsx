"use client";

/** Досье юрлица по адресу /company/:id. Устройство — как у /person/:id. */

import { Suspense, useEffect } from "react";
import { useParams } from "next/navigation";
import { Building2 } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { CompanyDossier } from "@/components/dossier/company-dossier";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { companyCase } from "@/lib/utils";
import { findCompany, useApp } from "@/store/use-app";

export default function CompanyPage() {
  return (
    <Suspense fallback={<DossierSkeleton />}>
      <CompanyRoute />
    </Suspense>
  );
}

function CompanyRoute() {
  const params = useParams<{ id: string }>();
  const hydrated = useApp((s) => s.hydrated);
  const db = useApp((s) => s.db);
  const log = useApp((s) => s.log);

  const company = findCompany(db, params.id);

  useEffect(() => {
    if (!hydrated || !company) return;
    log({
      action: "view_profile",
      subject: companyCase(company.name),
      subjectType: "company",
      ip: "10.0.1.12",
      status: "success",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, company?.id]);

  if (!hydrated) return <DossierSkeleton />;

  if (!company) {
    return (
      <Screen>
        <EmptyState
          icon={Building2}
          title="Организация не найдена"
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

  return (
    <CompanyDossier company={company} checklist={db.checklists.company} db={db} />
  );
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
