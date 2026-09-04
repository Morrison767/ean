"use client";

/**
 * Левая навигация.
 *
 * Подача из ДС ADATA: активный пункт лежит на брендовой подложке, а у левого
 * края меню его дублирует брендовая черта — подложка одна на всю строку и сама
 * по себе не отвечает на вопрос «где я», когда рядом наведён соседний пункт.
 *
 * Черта общая между пунктами (layoutId), поэтому при переходе она переезжает
 * по рельсу, а не мигает на новом месте. В свёрнутом виде черты нет: там
 * строка — это сама иконка на подложке, и лишний штрих сбивал бы ритм ряда.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { Logo } from "@/components/brand/logo";
import { NAV, activeNav } from "@/config/nav";
import { pillSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const active = activeNav(pathname);

  return (
    <aside
      className={cn(
        /* Каркас — цвет страницы, а не карточки: в светлой теме это одно и то
           же белое, в тёмной каркас остаётся тёмным, а карточки содержимого
           поднимаются над ним. */
        "z-40 flex h-screen shrink-0 flex-col border-r border-border bg-background",
        "transition-[width] duration-200 motion-reduce:transition-none",
        collapsed ? "w-19" : "w-[264px]"
      )}
    >
      <div
        className={cn(
          "flex h-[66px] shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Link
          href="/dashboard"
          title="На главную"
          className="flex items-center rounded-md transition-opacity hover:opacity-80"
        >
          <Logo compact={collapsed} />
        </Link>
      </div>

      <nav aria-label="Разделы" className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const current = active?.id === item.id;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex h-10 items-center rounded-10 text-sm transition-colors",
                    collapsed ? "mx-auto w-12 justify-center" : "w-full gap-3 px-3",
                    current
                      ? "bg-accent font-semibold text-primary"
                      : "font-normal text-foreground hover:bg-muted"
                  )}
                >
                  {current && !collapsed && (
                    <motion.span
                      layoutId="nav-marker"
                      aria-hidden="true"
                      transition={reduce ? { duration: 0 } : pillSpring}
                      className="absolute left-0 top-1/2 h-7 w-0.5 -translate-x-[9px] -translate-y-1/2 rounded-full bg-primary"
                    />
                  )}
                  <Icon
                    className={cn("h-5 w-5 shrink-0", current ? "text-icon-brand" : "text-icon")}
                    strokeWidth={1.8}
                  />
                  {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
