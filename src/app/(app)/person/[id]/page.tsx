/**
 * Маршрут досье физлица.
 *
 * Серверный компонент — только ради generateStaticParams: статический экспорт
 * (GitHub Pages) должен знать все адреса заранее, а из клиентского компонента
 * этот список не экспортировать. Вся работа — в PersonPage, он клиентский:
 * данные лежат в localStorage.
 */

import { PersonPage } from "@/components/dossier/person-route";
import people from "@/data/seed/people.json";

export function generateStaticParams() {
  /* Идентификаторы берём из посева: других субъектов в прототипе не бывает,
     а localStorage на этапе сборки недоступен. */
  return people.map((p) => ({ id: p.id }));
}

export default function Page() {
  return <PersonPage />;
}
