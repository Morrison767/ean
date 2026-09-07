/**
 * Конфигурация Next.
 *
 * Обычная сборка — сервер. Публикация на GitHub Pages включается переменной
 * GITHUB_PAGES: Pages раздаёт только статику и держит сайт в подкаталоге
 * /<репозиторий>, поэтому там нужны экспорт и basePath. Держать эти настройки
 * включёнными всегда нельзя — они ломают локальную разработку.
 */

const isPages = process.env.GITHUB_PAGES === "true";

/* Имя репозитория подставляет workflow; локальный экспорт по умолчанию — /ean. */
const repo = process.env.PAGES_BASE_PATH ?? "/ean";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  ...(isPages && {
    output: "export",
    basePath: repo,
    /*
      Своя папка для публикации. Иначе `next build` пишет в тот же .next, за
      которым следит запущенный `next dev`, — сборка ломает кеш разработки, и
      dev-сервер падает с MODULE_NOT_FOUND.

      Важно: при output: "export" готовый сайт кладётся именно сюда, а не в
      привычный out. Отсюда его и забирает workflow публикации.
    */
    distDir: "out-pages",
    /* Каждый маршрут становится каталогом с index.html: так Pages отдаёт
       страницу и по адресу со слэшем, и без него. */
    trailingSlash: true,
    /* Оптимизатор картинок — серверная возможность, в статике его нет. */
    images: { unoptimized: true },
  }),
};

export default nextConfig;
