import { Suspense } from "react";

import { SearchModule } from "@/components/modules/search-module";

/**
 * Досье: поиск и результаты.
 *
 * Запрос живёт в адресе (?q=…), поэтому результат можно переслать ссылкой и
 * он переживает перезагрузку. useSearchParams требует границы Suspense —
 * без неё Next не может отрисовать страницу статически.
 */
export default function SearchPage() {
  return (
    <Suspense>
      <SearchModule />
    </Suspense>
  );
}
