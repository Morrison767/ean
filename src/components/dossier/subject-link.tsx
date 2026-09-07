"use client";

/**
 * Ссылка на другого субъекта из досье.
 *
 * В прежней версии родственники, супруг, учредители и компании были
 * кликабельны — досье связано насквозь, и аналитик ходит по нему как по
 * графу, а не читает как справку. Если субъекта нет в базе, показываем
 * обычным текстом: мёртвая ссылка хуже её отсутствия.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/store/use-app";

export function PersonLink({
  name,
  iin,
  className,
}: {
  name?: string;
  iin?: string;
  className?: string;
}) {
  const people = useApp((s) => s.db.people);
  const found = people.find(
    (p) => (iin && p.iin === iin) || (name && p.fullName === name)
  );

  if (!found) return <span className={className}>{name ?? "—"}</span>;

  return (
    <Link
      href={`/person/${found.id}`}
      className={cn(
        "group inline-flex items-center gap-1 text-link transition-colors hover:text-link-hover",
        className
      )}
    >
      {name ?? found.fullName}
      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function CompanyLink({
  name,
  bin,
  className,
}: {
  name?: string;
  bin?: string;
  className?: string;
}) {
  const companies = useApp((s) => s.db.companies);
  const found = companies.find(
    (c) => (bin && c.bin === bin) || (name && c.name === name)
  );

  if (!found) return <span className={className}>{name ?? "—"}</span>;

  return (
    <Link
      href={`/company/${found.id}`}
      className={cn(
        "group inline-flex items-center gap-1 text-link transition-colors hover:text-link-hover",
        className
      )}
    >
      {name ?? found.name}
      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
