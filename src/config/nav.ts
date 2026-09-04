import {
  FileSpreadsheet,
  FolderSearch,
  Globe,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

/**
 * Разделы приложения.
 *
 * Порядок повторяет прежнюю навигацию E-Analytic: сначала работа с субъектом
 * (досье), затем источники данных по нарастанию специфичности, в конце —
 * служебный журнал.
 */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Пути, при которых пункт считается активным помимо самого href. */
  match?: string[];
}

export const NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Панель мониторинга",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "search",
    label: "Досье",
    href: "/search",
    icon: FolderSearch,
    match: ["/search", "/person", "/company"],
  },
  { id: "statements", label: "Выписки", href: "/statements", icon: ScrollText },
  { id: "esf", label: "ЭСФ", href: "/esf", icon: FileSpreadsheet },
  { id: "procurement", label: "Закупки", href: "/procurement", icon: ShoppingCart },
  { id: "ved", label: "ВЭД", href: "/ved", icon: Globe },
  { id: "audit", label: "Журнал действий", href: "/audit", icon: ShieldCheck },
];

/** Пункт, которому принадлежит текущий путь. */
export function activeNav(pathname: string): NavItem | undefined {
  return NAV.find((item) =>
    (item.match ?? [item.href]).some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  );
}
