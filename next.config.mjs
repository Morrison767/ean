/**
 * Конфигурация Next.
 *
 * Обычная сборка — сервер. Публикация на GitHub Pages включается переменной
 * GITHUB_PAGES: Pages раздаёт только статику и держит сайт в подкаталоге
 * /<репозиторий>, поэтому там нужны экспорт и basePath. Держать эти настройки
 * включёнными всегда нельзя — они ломают локальную разработку.
 */

import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants.js";

const isPages = process.env.GITHUB_PAGES === "true";

/* Имя репозитория подставляет workflow; локальный экспорт по умолчанию — /ean. */
const repo = process.env.PAGES_BASE_PATH ?? "/ean";

/*
  Сборка всегда пишет в свою папку, а не в .next.

  Иначе `next build` затирает кеш, за которым следит запущенный `next dev`:
  dev-сервер продолжает отвечать 200, но отдаёт страницы без чанков — в
  браузере пустой экран и 404 на /_next/static/chunks/main-app.js. Ошибка
  выглядит как поломка приложения, хотя приложение цело, и ищется долго.
  Поэтому разделение папок вынесено в конфигурацию, а не в дисциплину запуска.

  При output: "export" готовый сайт кладётся именно в distDir, а не в привычный
  out, — отсюда его и забирает workflow публикации.
*/
const buildDir = isPages ? "out-pages" : ".next-build";

/** @type {(phase: string) => import('next').NextConfig} */
export default function config(phase) {
  const isBuild = phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;

  return {
    reactStrictMode: true,

    ...(isBuild && { distDir: buildDir }),

    ...(isPages && {
      output: "export",
      basePath: repo,
      /* Каждый маршрут становится каталогом с index.html: так Pages отдаёт
         страницу и по адресу со слэшем, и без него. */
      trailingSlash: true,
      /* Оптимизатор картинок — серверная возможность, в статике его нет. */
      images: { unoptimized: true },
    }),
  };
}
