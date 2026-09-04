"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Наведение с задержкой (hover intent).
 *
 * Открывать по наведению можно только там, где наведение вообще существует:
 * на тач-устройствах события мыши эмулируются, и панель выскакивала бы от
 * случайного тапа. Поэтому обе задержки работают лишь при мыши
 * («(hover: hover) and (pointer: fine)») и на достаточно широком окне.
 *
 * Задержка на открытие отсекает проезд курсора вдоль меню, задержка на
 * закрытие даёт увести курсор в саму панель — это требование WCAG 1.4.13
 * (Hoverable): появившееся по наведению нельзя отбирать сразу.
 */
export function useHoverIntent({
  onOpen,
  onClose,
  openDelay = 320,
  closeDelay = 550,
  minWidth = 1024,
}: {
  onOpen: () => void;
  onClose: () => void;
  openDelay?: number;
  closeDelay?: number;
  minWidth?: number;
}) {
  /* Колбэки держим в ref: иначе enter/leave меняли бы идентичность на каждом
     рендере и обработчики приходилось бы переподписывать. */
  const openRef = useRef(onOpen);
  const closeRef = useRef(onClose);
  openRef.current = onOpen;
  closeRef.current = onClose;

  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearOpen = () => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };
  const clearClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const canHover = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      window.innerWidth >= minWidth,
    [minWidth]
  );

  const enter = useCallback(() => {
    if (!canHover()) return;
    clearClose();
    if (openTimer.current !== null) return;
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      openRef.current();
    }, openDelay);
  }, [canHover, openDelay]);

  const leave = useCallback(() => {
    if (!canHover()) return;
    clearOpen();
    clearClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      closeRef.current();
    }, closeDelay);
  }, [canHover, closeDelay]);

  /** Снять оба таймера — например когда закрыли кликом или клавишей. */
  const cancel = useCallback(() => {
    clearOpen();
    clearClose();
  }, []);

  useEffect(() => cancel, [cancel]);

  return { enter, leave, cancel, canHover };
}
