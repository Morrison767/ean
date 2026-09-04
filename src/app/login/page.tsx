"use client";

/**
 * Вход в систему.
 *
 * Прототип не проверяет пароль: сеанс — это флаг в localStorage. Форма
 * оставлена настоящей, потому что экран входа участвует в демонстрации, и
 * пустая заглушка вместо него ломала бы впечатление от остального.
 *
 * Появление — подъём с расфокусом (enter-soft из ДС), карточка и блок
 * демо-доступа выходят каскадом: сначала форма, следом подсказка.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, LogIn, ShieldCheck, Zap } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { FieldHint, Input, Label } from "@/components/ui/input";
import { motionTokens } from "@/lib/motion";
import { DEMO_SESSION, useApp } from "@/store/use-app";

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const hydrate = useApp((s) => s.hydrate);
  const hydrated = useApp((s) => s.hydrated);
  const session = useApp((s) => s.session);
  const signIn = useApp((s) => s.signIn);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  /* Уже вошёл — на панель, минуя форму. */
  useEffect(() => {
    if (hydrated && session) router.replace("/dashboard");
  }, [hydrated, session, router]);

  const enter = () => {
    setPending(true);
    signIn();
    router.push("/dashboard");
  };

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : motionTokens.distance.md },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0.12 : motionTokens.duration.slow,
      ease: motionTokens.easing.smooth,
      delay: reduce ? 0 : delay,
    },
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas p-4">
      {/* Брендовое свечение за карточкой — единственное украшение экрана. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex w-full max-w-[400px] flex-col gap-3">
        <motion.div
          {...rise(0)}
          className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-pop"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <Logo />
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Вход в систему
              </h1>
              <p className="text-sm text-muted-foreground">
                Цифровое развитие — это не просто внедрение технологий, а переход
                к более точным решениям.
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              enter();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
                autoComplete="username"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                autoComplete="current-password"
                addon={
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                    className="shrink-0 text-icon transition-colors hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>

            <CheckboxField
              id="remember"
              label="Запомнить меня"
              checked={remember}
              onCheckedChange={setRemember}
            />

            <Button type="submit" size="lg" icon={LogIn} loading={pending} block>
              Войти
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-icon-success" />
              Защищённое соединение · TLS 1.3
            </div>
          </form>
        </motion.div>

        <motion.div
          {...rise(0.08)}
          className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/40 bg-accent/60 p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Zap className="h-4 w-4" />
              Демо-доступ
            </span>
            <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-primary">
              Без регистрации
            </span>
          </div>
          <FieldHint>
            Ознакомьтесь с платформой в режиме демонстрации — все функции доступны
            с тестовыми данными.
          </FieldHint>
          <p className="text-xs text-muted-foreground">{DEMO_SESSION.email}</p>
          <Button variant="secondary" icon={Zap} onClick={enter} block>
            Войти в демо-режиме
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
