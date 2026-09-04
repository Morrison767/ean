"use client";

/**
 * Хранилище прототипа.
 *
 * Все демо-данные живут в localStorage: правки в интерфейсе переживают
 * перезагрузку, а бэкенда у прототипа нет. Это единственный модуль, который
 * знает про localStorage, — компоненты и стор ходят только сюда. Когда
 * появится настоящий API, меняется этот файл, а не экраны.
 *
 * Читать отсюда можно только на клиенте: на сервере localStorage нет, и любой
 * вызов во время серверного рендера вернёт null, а не бросит исключение.
 */

import { createSeed, SEED_VERSION, type Database } from "@/data/seed";

const DB_KEY = "ea:db";
const VERSION_KEY = "ea:db:version";

const canUseStorage = () => typeof window !== "undefined";

/** Безопасное чтение: приватный режим и переполнение квоты не должны ронять экран. */
function safeGet(key: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Приватный режим или кончилась квота — прототип продолжает работать
       на данных в памяти, просто не запомнит их до следующего запуска. */
  }
}

/**
 * База из хранилища. При первом запуске и при смене SEED_VERSION хранилище
 * пересевается: держать данные, разложенные по старой модели, дороже, чем
 * потерять правки в демо-режиме.
 */
export function loadDatabase(): Database {
  const seed = createSeed();
  if (!canUseStorage()) return seed;

  const storedVersion = Number(safeGet(VERSION_KEY));
  if (storedVersion !== SEED_VERSION) {
    saveDatabase(seed);
    return seed;
  }

  const raw = safeGet(DB_KEY);
  if (!raw) {
    saveDatabase(seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Database>;
    /* Недостающие разделы добираем из посева: так добавленная в модель
       коллекция появляется без сброса всего остального. */
    return { ...seed, ...parsed };
  } catch {
    saveDatabase(seed);
    return seed;
  }
}

export function saveDatabase(db: Database): void {
  safeSet(VERSION_KEY, String(SEED_VERSION));
  safeSet(DB_KEY, JSON.stringify(db));
}

/** Сброс к исходным демо-данным — пункт в меню пользователя. */
export function resetDatabase(): Database {
  const seed = createSeed();
  saveDatabase(seed);
  return seed;
}

/* ------------------------------------------------------------------ */
/* Пользовательские настройки: тема живёт отдельно (её читает скрипт в
   разметке до гидратации), здесь — всё остальное.                      */
/* ------------------------------------------------------------------ */

const PREFS_KEY = "ea:prefs";

export interface Prefs {
  /** Свёрнут ли рельс навигации. */
  sidebarCollapsed: boolean;
  /** Последние поисковые запросы, свежие сверху. */
  recentSearches: string[];
}

export const defaultPrefs: Prefs = {
  sidebarCollapsed: false,
  recentSearches: [],
};

export function loadPrefs(): Prefs {
  const raw = safeGet(PREFS_KEY);
  if (!raw) return defaultPrefs;
  try {
    return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return defaultPrefs;
  }
}

export function savePrefs(prefs: Prefs): void {
  safeSet(PREFS_KEY, JSON.stringify(prefs));
}
