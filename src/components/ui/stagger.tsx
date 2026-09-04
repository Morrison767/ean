"use client";

/**
 * Каскад появления карточек (stagger).
 *
 * Карточки раздела выезжают не разом, а одна за другой с задержкой 60 мс —
 * взгляд успевает пройти сверху вниз и понять структуру страницы. Задержку
 * держим меньше 100 мс, иначе список начинает казаться медленным.
 */

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  /*
    Карточки часто лежат внутри условного фрагмента (`{data ? <>…</> : …}`).
    Без разворачивания фрагмент стал бы одним элементом каскада, а его
    содержимое потеряло бы отступ gap-4 — карточки слипались.
  */
  const flatten = (nodes: React.ReactNode): React.ReactNode[] =>
    React.Children.toArray(nodes).flatMap((child) =>
      React.isValidElement(child) && child.type === React.Fragment
        ? flatten((child.props as { children?: React.ReactNode }).children)
        : [child]
    );

  const items = flatten(children).filter(Boolean);

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.06 } },
  };

  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : motionTokens.distance.sm },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduce ? 0.12 : motionTokens.duration.normal,
        ease: motionTokens.easing.smooth,
      },
    },
  };

  return (
    <motion.div
      className={cn("flex flex-col gap-4", className)}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {items.map((child, i) => (
        // gap-4 и на обёртке — если внутри окажется несколько карточек.
        <motion.div key={i} variants={item} className="flex flex-col gap-4">
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
