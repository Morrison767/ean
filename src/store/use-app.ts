"use client";

/**
 * Состояние приложения.
 *
 * Zustand, а не Context: экранов много, состояние читают десятки компонентов,
 * и на Context каждая правка запроса перерисовывала бы всё поддерево.
 * Подписка по селектору обновляет только тех, кого касается изменение.
 *
 * Данные приходят из localStorage, то есть только на клиенте. Поэтому стор
 * стартует пустым и заполняется в `hydrate()` после монтирования, а экраны до
 * этого показывают скелетоны. Штатный `persist` здесь не подходит: он
 * восстанавливает состояние синхронно и расходится с серверной разметкой.
 */

import { create } from "zustand";

import {
  defaultPrefs,
  loadDatabase,
  loadPrefs,
  resetDatabase,
  saveDatabase,
  savePrefs,
  type Prefs,
} from "@/lib/storage";
import { createSeed, type Database } from "@/data/seed";
import type { AuditEntry, Company, Person, Subject } from "@/data/types";

/** Кто «работает» в прототипе. Логина по-настоящему нет — это демо-сеанс. */
export interface Session {
  name: string;
  role: string;
  city: string;
  initials: string;
  email: string;
}

export const DEMO_SESSION: Session = {
  name: "Асыл Рахманов",
  role: "Аналитик",
  city: "Астана",
  initials: "АР",
  email: "demo@e-analytic.kz",
};

interface AppState {
  /** Данные подняты из localStorage. До этого экраны рисуют скелетоны. */
  hydrated: boolean;
  db: Database;
  prefs: Prefs;
  session: Session | null;
  /** Текущий поисковый запрос — общий для строки в шапке и страницы поиска. */
  query: string;

  hydrate: () => void;
  signIn: () => void;
  signOut: () => void;
  setQuery: (query: string) => void;
  rememberSearch: (query: string) => void;
  toggleSidebar: () => void;
  /** Запись в журнал действий: прототип ведёт его как настоящая система. */
  log: (entry: Omit<AuditEntry, "id" | "ts" | "user">) => void;
  resetDemo: () => void;
}

const SESSION_KEY = "ea:session";

const now = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export const useApp = create<AppState>((set, get) => ({
  hydrated: false,
  /* До гидратации держим посев: типы совпадают, и компонентам не нужны
     проверки на null там, где данные обязательны. */
  db: createSeed(),
  prefs: defaultPrefs,
  session: null,
  query: "",

  hydrate: () => {
    if (get().hydrated) return;
    let session: Session | null = null;
    try {
      session = window.localStorage.getItem(SESSION_KEY) ? DEMO_SESSION : null;
    } catch {
      session = null;
    }
    set({
      hydrated: true,
      db: loadDatabase(),
      prefs: loadPrefs(),
      session,
    });
  },

  signIn: () => {
    try {
      window.localStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* Приватный режим — сеанс не переживёт перезагрузку, и это нормально. */
    }
    set({ session: DEMO_SESSION });
  },

  signOut: () => {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* см. выше */
    }
    set({ session: null });
  },

  setQuery: (query) => set({ query }),

  rememberSearch: (query) => {
    const q = query.trim();
    if (!q) return;
    const prefs = get().prefs;
    const recentSearches = [q, ...prefs.recentSearches.filter((x) => x !== q)].slice(0, 8);
    const next = { ...prefs, recentSearches };
    savePrefs(next);
    set({ prefs: next });
  },

  toggleSidebar: () => {
    const prefs = get().prefs;
    const next = { ...prefs, sidebarCollapsed: !prefs.sidebarCollapsed };
    savePrefs(next);
    set({ prefs: next });
  },

  log: (entry) => {
    const { db, session } = get();
    const record: AuditEntry = {
      id: String(Date.now()),
      ts: now(),
      user: session?.name ?? DEMO_SESSION.name,
      ...entry,
    };
    /* Свежая запись сверху: журнал читают с последнего действия. */
    const next: Database = { ...db, audit: [record, ...db.audit] };
    saveDatabase(next);
    set({ db: next });
  },

  resetDemo: () => set({ db: resetDatabase() }),
}));

/* ------------------------------------------------------------------ */
/* Выборки. Держим их рядом со стором, а не в компонентах: одна и та же
   логика поиска нужна и строке в шапке, и странице результатов.        */
/* ------------------------------------------------------------------ */

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Совпадение по имени, ИИН/БИН, телефону или почте. */
export function matchSubject(subject: Subject, query: string): boolean {
  const q = norm(query);
  if (!q) return false;
  const haystack =
    subject.kind === "person"
      ? [subject.fullName, subject.iin, subject.phone, subject.email, ...(subject.telegram ?? [])]
      : [subject.name, subject.bin, subject.phone, subject.email, subject.website];
  return haystack.some((v) => v && norm(String(v)).includes(q));
}

/** Люди и компании одним списком — так их показывает вкладка «Все». */
export function allSubjects(db: Database): Subject[] {
  return [
    ...db.people.map((p): Subject => ({ kind: "person", ...p })),
    ...db.companies.map((c): Subject => ({ kind: "company", ...c })),
  ];
}

export const findPerson = (db: Database, id: string): Person | undefined =>
  db.people.find((p) => p.id === id || p.iin === id);

export const findCompany = (db: Database, id: string): Company | undefined =>
  db.companies.find((c) => c.id === id || c.bin === id);
