import {
  BarChart2,
  Cpu,
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Dict } from "@/lib/i18n";

/** Khóa dịch cho một mục điều hướng — chuỗi lấy từ `t.nav[id]`. */
export type NavId = keyof Dict["nav"];
/** Khóa dịch cho nhóm điều hướng — chuỗi lấy từ `t.navGroup[id]`. */
export type NavGroupId = keyof Dict["navGroup"];

/** Một mục điều hướng — dùng cho sidebar, rail, thanh đáy và sheet "Khác". */
export interface NavItem {
  href: string;
  id: NavId;
  icon: LucideIcon;
  group: NavGroupId;
  /** Tối đa 4 mục hiển thị trực tiếp trên thanh đáy mobile (§7). */
  mobilePrimary?: boolean;
}

/** Thứ tự nhóm cố định — sidebar, rail và sheet đều sinh từ đây (§7). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", id: "overview", icon: LayoutDashboard, group: "monitoring", mobilePrimary: true },
  {
    href: "/conversations",
    id: "conversations",
    icon: MessageSquare,
    group: "monitoring",
    mobilePrimary: true,
  },
  {
    href: "/customers",
    id: "customers",
    icon: Users,
    group: "directory",
    mobilePrimary: true,
  },
  {
    href: "/volume",
    id: "volume",
    icon: BarChart2,
    group: "analytics",
  },
  { href: "/products", id: "products", icon: ShoppingBag, group: "analytics" },
  {
    href: "/knowledge",
    id: "knowledge",
    icon: Cpu,
    group: "system",
  },
];

export interface NavGroup {
  name: NavGroupId;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = NAV_ITEMS.reduce<NavGroup[]>((acc, item) => {
  const last = acc[acc.length - 1];
  if (last && last.name === item.group) last.items.push(item);
  else acc.push({ name: item.group, items: [item] });
  return acc;
}, []);

export const MOBILE_PRIMARY: NavItem[] = NAV_ITEMS.filter((item) => item.mobilePrimary);

/** Mục đang chọn = href dài nhất khớp URL (§7). */
export function activeHref(pathname: string): string {
  const matches = NAV_ITEMS.filter(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  );
  return matches.reduce<string | null>(
    (best, item) => (best === null || item.href.length > best.length ? item.href : best),
    null
  ) ?? "/";
}
