"use client";

/**
 * Корень: уводит на панель мониторинга.
 *
 * Переход клиентский, а не через redirect() на сервере: в статическом экспорте
 * серверного редиректа не существует — страницу нужно чем-то отдать, и увести
 * с неё уже в браузере. Заодно так работает и basePath: router сам добавит
 * префикс, которого в жёсткой ссылке пришлось бы не забыть.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  /* Пустой холст цвета страницы: мелькнувший белый прямоугольник заметнее,
     чем отсутствие содержимого на те же полсекунды. */
  return <main className="min-h-screen bg-canvas" aria-busy="true" />;
}
