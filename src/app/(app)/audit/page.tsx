"use client";

/**
 * Журнал действий.
 *
 * Записи копятся по ходу работы: поиск и открытие досье пишутся в журнал
 * стором. Это не декорация — система с доступом к персональным данным обязана
 * показывать, кто и что смотрел, и в прототипе журнал ведёт себя так же.
 */

import { useMemo, useState } from "react";
import {
  Eye,
  FileDown,
  History,
  Search as SearchIcon,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { Screen } from "@/components/app/screen";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from "@/components/ui/table";
import { counted, num } from "@/lib/format";
import { useApp } from "@/store/use-app";

/** Подписи и значки действий: в фикстурах и в сторе они приходят кодом. */
const ACTIONS: Record<string, { label: string; icon: typeof Eye }> = {
  search: { label: "Поиск", icon: SearchIcon },
  view_profile: { label: "Просмотр досье", icon: Eye },
  export: { label: "Выгрузка", icon: FileDown },
  ai_analysis: { label: "AI-анализ", icon: ShieldCheck },
  check: { label: "Проверка", icon: UserCheck },
};

type Scope = "all" | "search" | "view_profile";

export default function AuditPage() {
  const audit = useApp((s) => s.db.audit);
  const [term, setTerm] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    return audit.filter((e) => {
      if (scope !== "all" && e.action !== scope) return false;
      if (!q) return true;
      return [e.user, e.subject, e.ip, ACTIONS[e.action]?.label ?? e.action].some((v) =>
        String(v).toLowerCase().includes(q)
      );
    });
  }, [audit, term, scope]);

  const counts = useMemo(
    () => ({
      all: audit.length,
      search: audit.filter((e) => e.action === "search").length,
      view: audit.filter((e) => e.action === "view_profile").length,
      users: new Set(audit.map((e) => e.user)).size,
    }),
    [audit]
  );

  return (
    <Screen
      title="Журнал действий"
      subtitle="Кто, что и когда запрашивал в системе"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Всего записей" value={num(counts.all)} icon={History} />
        <KpiTile label="Поисковых запросов" value={num(counts.search)} icon={SearchIcon} />
        <KpiTile label="Просмотров досье" value={num(counts.view)} icon={Eye} />
        <KpiTile label="Пользователей" value={num(counts.users)} icon={UserCheck} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          icon={SearchIcon}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Пользователь, субъект или IP"
          className="sm:max-w-md"
        />
        <SegmentedControl
          value={scope}
          onChange={(v) => setScope(v as Scope)}
          items={[
            { id: "all", label: "Все", count: counts.all },
            { id: "search", label: "Поиск", count: counts.search },
            { id: "view_profile", label: "Просмотры", count: counts.view },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Записей не найдено"
          description="Измените запрос или снимите фильтр по типу действия."
        />
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            Показано {counted(filtered.length, "запись", "записи", "записей")}
          </span>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <TableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Время</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Субъект</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Результат</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => {
                    const meta = ACTIONS[e.action];
                    const Icon = meta?.icon ?? History;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                          {e.ts}
                        </TableCell>
                        <TableCell className="font-medium">{e.user}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-icon-secondary" />
                            {meta?.label ?? e.action}
                          </span>
                        </TableCell>
                        <TableCell>{e.subject}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{e.ip}</TableCell>
                        <TableCell>
                          <Badge tone={e.status === "success" ? "success" : "danger"} size="sm">
                            {e.status === "success" ? "Успешно" : "Отказано"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableWrap>
          </div>
        </div>
      )}
    </Screen>
  );
}
