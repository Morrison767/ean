/**
 * Страны, встречающиеся в декларациях.
 *
 * Двухбуквенный код в таблице читается хуже названия, а на карте нужны ещё и
 * координаты. Справочник ровно под данные прототипа — полный список ISO был бы
 * мёртвым грузом. Значения перенесены из прежней версии.
 */

export interface CountryInfo {
  name: string;
  flag: string;
  lat: number;
  lng: number;
}

export const COUNTRIES: Record<string, CountryInfo> = {
  CN: { name: "Китай", flag: "🇨🇳", lat: 35.8, lng: 104.2 },
  RU: { name: "Россия", flag: "🇷🇺", lat: 61.5, lng: 99 },
  DE: { name: "Германия", flag: "🇩🇪", lat: 51.2, lng: 10.4 },
  AE: { name: "ОАЭ", flag: "🇦🇪", lat: 24, lng: 54 },
  TR: { name: "Турция", flag: "🇹🇷", lat: 39, lng: 35.2 },
  NL: { name: "Нидерланды", flag: "🇳🇱", lat: 52.1, lng: 5.3 },
  KR: { name: "Южная Корея", flag: "🇰🇷", lat: 36.5, lng: 127.8 },
  US: { name: "США", flag: "🇺🇸", lat: 37.1, lng: -95.7 },
  UZ: { name: "Узбекистан", flag: "🇺🇿", lat: 41.4, lng: 64.6 },
  KG: { name: "Кыргызстан", flag: "🇰🇬", lat: 41.2, lng: 74.8 },
  KZ: { name: "Казахстан", flag: "🇰🇿", lat: 48, lng: 67 },
};

/** Неизвестный код показываем как есть — данные важнее аккуратной заглушки. */
export function country(code: string): CountryInfo {
  return COUNTRIES[code] ?? { name: code, flag: "🏳️", lat: 0, lng: 0 };
}

/** Совместимость с местами, где нужно только название. */
export const COUNTRY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRIES).map(([code, c]) => [code, c.name])
);
