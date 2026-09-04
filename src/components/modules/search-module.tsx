"use client";

/**
 * Модуль «Досье».
 *
 * Два состояния одного экрана: посадочный поиск, пока запроса нет, и
 * результаты, когда он появился. Разными страницами их не делаем — переход
 * между ними это смена содержимого, а не места, и общий заголовок с полем
 * должен оставаться на месте.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, History, Search, Star } from "lucide-react";

import { Screen } from "@/components/app/screen";
import { SubjectCard } from "@/components/app/subject-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Stagger } from "@/components/ui/stagger";
import { SegmentedControl } from "@/components/ui/tabs";
import { motionTokens } from "@/lib/motion";
import { counted } from "@/lib/format";
import { allSubjects, matchSubject, useApp } from "@/store/use-app";

/** Подсказки на посадочном экране — как в прежней версии. */
const SUGGESTIONS = [
  "Рамазанов Жасулан",
  "EIDE Software",
  "МегаТрейд",
  "000203302201",
  "Байжанов Ерлан",
];

type Kind = "all" | "person" | "company";

export function SearchModule() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();

  const query = params.get("q") ?? "";
  const db = useApp((s) => s.db);
  const recent = useApp((s) => s.prefs.recentSearches);
  const rememberSearch = useApp((s) => s.rememberSearch);
  const log = useApp((s) => s.log);

  const [term, setTerm] = useState(query);
  const [kind, setKind] = useState<Kind>("all");

  /* Поле следует за адресом: переход «назад» должен возвращать и запрос. */
  useEffect(() => setTerm(query), [query]);

  /* Запрос попадает в историю и журнал один раз — при смене самого запроса. */
  useEffect(() => {
    if (!query) return;
    rememberSearch(query);
    log({ action: "search", subject: query, subjectType: "query", ip: "10.0.1.12", status: "success" });
  }, [query, rememberSearch, log]);

  const found = useMemo(
    () => (query ? allSubjects(db).filter((s) => matchSubject(s, query)) : []),
    [db, query]
  );

  const counts = {
    all: found.length,
    person: found.filter((s) => s.kind === "person").length,
    company: found.filter((s) => s.kind === "company").length,
  };

  const shown = kind === "all" ? found : found.filter((s) => s.kind === kind);

  const go = (q: string) => {
    const v = q.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  /* -------------------- посадочный экран -------------------- */
  if (!query) {
    return (
      <Screen className="max-w-[900px]">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : motionTokens.distance.md }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduce ? 0.12 : motionTokens.duration.slow,
            ease: motionTokens.easing.smooth,
          }}
          className="flex flex-col items-center gap-6 pt-8 text-center sm:pt-16"
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Глобальный поиск
            </h1>
            <p className="text-sm text-muted-foreground">
              Поиск компаний и людей по ИИН/БИН, ФИО, телефону, email или никнейму.
            </p>
          </div>

          <form
            className="flex w-full max-w-[620px] items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              go(term);
            }}
          >
            <Input
              icon={Search}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Поиск по ИИН/БИН, ФИО, телефону, email, никнейму…"
              className="h-12 rounded-full"
              autoFocus
            />
            <Button type="submit" size="lg" className="rounded-full px-7">
              Найти
            </Button>
          </form>

          <div className="flex w-full flex-col gap-3">
            <span className="flex items-center justify-center gap-2 text-overline uppercase text-muted-foreground">
              <Star className="h-3.5 w-3.5" />
              Частые запросы
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => go(s)}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {recent.length > 0 && (
            <div className="flex w-full max-w-[620px] flex-col gap-2 text-left">
              <span className="flex items-center gap-2 text-overline uppercase text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Недавние запросы
              </span>
              <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                {recent.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => go(r)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-surface"
                    >
                      <span className="truncate text-sm text-foreground">{r}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-icon-secondary" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </Screen>
    );
  }

  /* -------------------- результаты -------------------- */
  return (
    <Screen
      title={
        <>
          Найдено: <span className="text-primary">{found.length}</span>
        </>
      }
      subtitle={`по запросу «${query}»`}
      actions={
        <Button variant="secondary" icon={Search} onClick={() => router.push("/search")}>
          Новый поиск
        </Button>
      }
    >
      <form
        className="flex items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          go(term);
        }}
      >
        <Input
          icon={Search}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Уточните запрос"
          className="h-11"
        />
        <Button type="submit">Найти</Button>
      </form>

      <SegmentedControl
        value={kind}
        onChange={(v) => setKind(v as Kind)}
        items={[
          { id: "all", label: "Все", count: counts.all },
          { id: "person", label: "Физлица", count: counts.person },
          { id: "company", label: "Юр. лица", count: counts.company },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Нет результатов по заданным фильтрам"
          description="Попробуйте изменить параметры поиска или уточнить запрос."
        />
      ) : (
        <>
          <span className="text-xs text-muted-foreground">
            Показано {counted(shown.length, "субъект", "субъекта", "субъектов")}
          </span>
          <Stagger>
            {shown.map((s) => (
              <SubjectCard key={`${s.kind}-${s.id}`} subject={s} />
            ))}
          </Stagger>
        </>
      )}
    </Screen>
  );
}
