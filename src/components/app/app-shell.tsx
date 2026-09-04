"use client";

/**
 * Каркас приложения: рельс навигации, шапка и область модуля.
 *
 * Здесь же поднимаются данные из localStorage. Гидратация отложена до
 * монтирования намеренно: на сервере localStorage нет, и синхронное чтение
 * разошлось бы с серверной разметкой. Пока данных нет, модуль не рисуется —
 * вместо него держим место той же геометрии, чтобы страница не прыгала.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { TopHeader } from "@/components/app/top-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/store/use-app";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const hydrate = useApp((s) => s.hydrate);
  const hydrated = useApp((s) => s.hydrated);
  const session = useApp((s) => s.session);
  const collapsed = useApp((s) => s.prefs.sidebarCollapsed);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  /* Без сеанса модули не показываем. Проверка только после гидратации: до неё
     session всегда null, и мы бы выкидывали на логин даже вошедшего. */
  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
  }, [hydrated, session, router]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="min-h-0 flex-1 overflow-y-auto">
          {hydrated && session ? children : <ShellPlaceholder key={pathname} />}
        </main>
      </div>
    </div>
  );
}

/** Заглушка на время подъёма данных: ритм страницы, а не пустой экран. */
function ShellPlaceholder() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
