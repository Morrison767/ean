"use client";

/**
 * Подсказка при наведении — перенос поведения из прежней версии.
 *
 * Рисуется порталом в body, а не рядом с целью: внутри таблиц и карточек с
 * overflow подсказка обрезалась бы контейнером. Позиция считается от
 * прямоугольника цели и прижимается к окну — 8px от любого края; если снизу
 * не помещается, подсказка переворачивается наверх.
 *
 * До первого измерения элемент уводится за экран, а не прячется через
 * display: скрытый блок нельзя измерить, а измерить его нужно, чтобы понять,
 * помещается ли он.
 */

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const GAP = 6;
const EDGE = 8;

export function Tooltip({
  content,
  children,
  className,
  align = "center",
}: {
  /** Содержимое подсказки. Пустое значение отключает её. */
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: "center" | "left";
}) {
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null);
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null);
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);

  const measure = () => {
    const rect = hostRef.current?.getBoundingClientRect();
    if (rect) setAnchor(rect);
  };

  React.useLayoutEffect(() => {
    if (!anchor || !tipRef.current) return;
    const tip = tipRef.current.getBoundingClientRect();

    let left = align === "left" ? anchor.left : anchor.left + anchor.width / 2 - tip.width / 2;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - tip.width - EDGE));

    let top = anchor.bottom + GAP;
    if (top + tip.height > window.innerHeight - EDGE) {
      top = Math.max(EDGE, anchor.top - tip.height - GAP);
    }
    setPos({ left, top });
  }, [anchor, align]);

  const close = () => {
    setAnchor(null);
    setPos(null);
  };

  return (
    <span
      ref={hostRef}
      className={cn("inline-flex", className)}
      onMouseEnter={measure}
      /* Пока подсказка не показана, следим за движением: курсор мог войти в
         элемент без события enter (например, после прокрутки под курсором). */
      onMouseMove={anchor ? undefined : measure}
      onMouseLeave={close}
      onFocus={measure}
      onBlur={close}
    >
      {children}
      {anchor &&
        content &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className={cn(
              "pointer-events-none fixed z-[80] w-max min-w-[140px] max-w-[260px]",
              "rounded-10 border border-border bg-card p-2 text-left text-xs text-foreground shadow-pop-strong"
            )}
            style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0, visibility: "hidden" }}
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  );
}
