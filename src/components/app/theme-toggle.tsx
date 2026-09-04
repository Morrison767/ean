"use client";

/**
 * Переключатель темы.
 *
 * Две пилюли в общей подложке, активная — переезжающая карточка (layoutId), та
 * же пружина, что у сегментного переключателя. До монтирования тема неизвестна
 * (её ставит скрипт в разметке из localStorage), поэтому подложка не рисуется:
 * иначе она успевала бы мигнуть не на той половине.
 */

import { Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { pillSpring } from "@/lib/motion";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { dark, ready, set } = useTheme();
  const reduce = useReducedMotion();

  const options = [
    { id: "light" as const, icon: Sun, label: "Светлая тема", on: ready && !dark },
    { id: "dark" as const, icon: Moon, label: "Тёмная тема", on: ready && dark },
  ];

  return (
    <div className="flex items-center gap-1 rounded-10 bg-muted p-1">
      {options.map(({ id, icon: Icon, label, on }) => (
        <button
          key={id}
          type="button"
          onClick={() => set(id)}
          aria-pressed={on}
          title={label}
          className={cn(
            "relative grid h-7 w-7 place-items-center rounded-md transition-colors",
            on ? "text-primary" : "text-icon-secondary hover:text-foreground"
          )}
        >
          {on && (
            <motion.span
              layoutId="theme-pill"
              transition={reduce ? { duration: 0 } : pillSpring}
              className="absolute inset-0 rounded-md bg-card shadow-segment"
            />
          )}
          <Icon className="relative h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
