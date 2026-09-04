"use client";

/**
 * Документы субъекта, разложенные по типам.
 *
 * Четыре типа как в прежней версии — паспорт, удостоверение, диплом и
 * водительское. Вкладка показывается всегда, даже когда документа нет: сам
 * факт отсутствия — это ответ, а исчезающая вкладка заставляла бы гадать,
 * проверяли ли её вообще.
 */

import { useState } from "react";
import { BookUser, Car, GraduationCap, IdCard } from "lucide-react";

import { DataList, Field } from "@/components/dossier/data-list";
import { SegmentedControl } from "@/components/ui/tabs";

/** Тип документа → как он назван в данных. Совпадение по подстроке: в
    фикстурах встречается и «Удостоверение личности», и «Удостоверение». */
const KINDS = [
  { id: "passport", label: "Паспорт", icon: BookUser, match: /паспорт/i },
  { id: "id", label: "Удостоверение", icon: IdCard, match: /удостоверен/i },
  { id: "diploma", label: "Диплом", icon: GraduationCap, match: /диплом/i },
  { id: "license", label: "Вод. уд.", icon: Car, match: /водител|вод\./i },
];

export function DocumentsTabs({
  documents,
}: {
  documents: Array<Record<string, string>>;
}) {
  const [kind, setKind] = useState(KINDS[0].id);
  const active = KINDS.find((k) => k.id === kind)!;
  const doc = documents.find((d) => active.match.test(d.type ?? ""));

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <SegmentedControl
        value={kind}
        onChange={setKind}
        items={KINDS.map((k) => ({
          id: k.id,
          label: k.label,
          icon: k.icon,
          count: documents.some((d) => k.match.test(d.type ?? "")) ? 1 : 0,
        }))}
      />

      {doc ? (
        <DataList cols={3}>
          <Field label="Тип" value={doc.type} />
          <Field label="Номер" value={doc.number} mono />
          <Field label="Выдан" value={doc.issued} mono />
          <Field label="Действителен до" value={doc.expires} mono />
          <Field label="Орган выдачи" value={doc.authority} span={2} />
        </DataList>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">
          Документ «{active.label}» в базе отсутствует.
        </p>
      )}
    </div>
  );
}
