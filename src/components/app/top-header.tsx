"use client";

/**
 * Шапка приложения.
 *
 * Высота 66 — как строка логотипа в рельсе: линия под шапкой и линия под
 * логотипом должны совпадать, иначе каркас выглядит собранным из двух разных
 * макетов.
 */

import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, PanelLeft, Settings } from "lucide-react";

import { IconButton } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { useApp } from "@/store/use-app";

export function TopHeader() {
  const router = useRouter();
  const toggleSidebar = useApp((s) => s.toggleSidebar);

  return (
    <header className="flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-1">
        <IconButton
          icon={PanelLeft}
          label="Свернуть меню"
          size="icon-sm"
          onClick={toggleSidebar}
        />
        <IconButton
          icon={ArrowLeft}
          label="Назад"
          size="icon-sm"
          onClick={() => router.back()}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <IconButton icon={Settings} label="Настройки" size="icon-sm" />
        <span className="relative">
          <IconButton icon={Bell} label="Уведомления" size="icon-sm" />
          {/* Метка непрочитанного: кольцо цветом шапки отделяет её от значка. */}
          <span className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-background" />
        </span>
        <span className="mx-1 h-5 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
