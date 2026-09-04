"use client";

/**
 * Меню пользователя.
 *
 * Кроме выхода здесь живёт сброс демо-данных: прототип хранит всё в
 * localStorage, и вернуть исходное состояние иначе можно только через
 * инструменты разработчика.
 */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, LogOut, RotateCcw } from "lucide-react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { DEMO_SESSION, useApp } from "@/store/use-app";

export function UserMenu() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const session = useApp((s) => s.session) ?? DEMO_SESSION;
  const signOut = useApp((s) => s.signOut);
  const resetDemo = useApp((s) => s.resetDemo);

  /* Клик мимо и Escape закрывают меню — как у любой всплывающей поверхности. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-10 px-2 py-1.5 transition-colors hover:bg-muted"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-primary">
          {session.initials}
        </span>
        <span className="hidden text-left sm:flex sm:flex-col">
          <span className="text-xs font-semibold leading-tight text-foreground">
            {session.name}
          </span>
          <span className="text-xs leading-tight text-muted-foreground">
            {session.role} · {session.city}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-icon-secondary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: reduce ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{
              duration: reduce ? 0 : motionTokens.duration.fast,
              ease: motionTokens.easing.smooth,
            }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-12 border border-border bg-card p-1 shadow-pop"
          >
            <div className="border-b border-border px-3 py-2">
              <div className="text-sm font-semibold text-foreground">{session.name}</div>
              <div className="text-xs text-muted-foreground">{session.email}</div>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                resetDemo();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4 text-icon" />
              Сбросить демо-данные
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                signOut();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-danger transition-colors hover:bg-danger-subtle"
            >
              <LogOut className="h-4 w-4" />
              Выйти из системы
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
