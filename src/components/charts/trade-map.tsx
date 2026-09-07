"use client";

/**
 * Карта стран внешней торговли.
 *
 * Перенос из прежней версии: круговой маркер на страну, радиус — от
 * товарооборота, цвет — от уровня риска. Подложка CARTO переключается вместе
 * с темой приложения, иначе светлая карта в тёмном интерфейсе бьёт по глазам.
 *
 * Компонент только клиентский: Leaflet обращается к window при загрузке, и на
 * сервере его импорт падает. Подключать его нужно через dynamic(ssr:false).
 */

import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { country } from "@/config/countries";
import { usd } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import type { RiskLevel } from "@/data/types";

export interface MapPoint {
  code: string;
  total: number;
  operations: number;
  risk: RiskLevel;
  /** Направление — в подсказке маркера. */
  kind: "import" | "export" | "both";
}

/** Цвет маркера по риску — те же тона, что у бейджей. */
const RISK_COLOR: Record<RiskLevel, string> = {
  none: "#068DFF",
  medium: "#FE9A00",
  high: "#E7000B",
};

/** Радиус маркера: корень от оборота, зажатый в 9…34 — как в оригинале. */
const radiusOf = (total: number) =>
  Math.max(9, Math.min(34, 8 + Math.sqrt(total / 1e6) * 5));

export function TradeMap({ points }: { points: MapPoint[] }) {
  const { dark, ready } = useTheme();
  /* Leaflet измеряет контейнер при монтировании; до первого кадра размера
     ещё нет, поэтому карту показываем после него. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !ready) {
    return <div className="h-[440px] w-full animate-pulse rounded-12 bg-muted" />;
  }

  /*
    Прежняя версия брала подложку CARTO (light_all / dark_all). Сегодня она
    требует ключ и печатает поверх карты «API KEY REQUIRED», поэтому берём
    тайлы OSM без ключа, а приглушённый вид дизайн-системы возвращаем
    фильтром: обесцвечиваем и осветляем, в тёмной теме дополнительно
    инвертируем. Ключ добавить можно — тогда достаточно вернуть URL CARTO.
  */
  const tiles = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileFilter = dark
    ? "grayscale(1) invert(1) brightness(0.85) contrast(0.9)"
    : "grayscale(1) brightness(1.06) contrast(0.92)";

  return (
    <div className="flex flex-col gap-2 p-4 sm:p-5">
      <p className="text-xs text-muted-foreground">
        Карта стран происхождения (импорт) и назначения (экспорт). Размер маркера —
        товарооборот, цвет — уровень риска.
      </p>

      <div
        className="overflow-hidden rounded-12 border border-border [&_.leaflet-tile-pane]:![filter:var(--tile-filter)]"
        style={{ height: 440, ["--tile-filter" as string]: tileFilter }}
      >
        <MapContainer
          center={[40, 55]}
          zoom={3}
          minZoom={2}
          /* Колесо не масштабирует: страница длинная, и прокрутка мимо карты
             не должна проваливаться в зум. */
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%", background: "hsl(var(--muted))" }}
        >
          <TileLayer attribution="© OpenStreetMap" url={tiles} />
          {points.map((p) => {
            const geo = country(p.code);
            const color = RISK_COLOR[p.risk] ?? RISK_COLOR.none;
            return (
              <CircleMarker
                key={p.code}
                center={[geo.lat, geo.lng]}
                radius={radiusOf(p.total)}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.45, weight: 2 }}
              >
                <Popup>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">
                      {geo.flag} {geo.name}
                    </span>
                    <span className="text-xs">Оборот: {usd(p.total)}</span>
                    <span className="text-xs">Операций: {p.operations}</span>
                    <span className="text-xs">
                      {p.kind === "import"
                        ? "Импорт"
                        : p.kind === "export"
                          ? "Экспорт"
                          : "Импорт и экспорт"}
                    </span>
                  </span>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
