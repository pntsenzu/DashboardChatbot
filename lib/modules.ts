import {
  BarChart2,
  Cpu,
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Một mục điều hướng — dùng cho sidebar, rail, thanh đáy và sheet "Khác". */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  /** Tối đa 4 mục hiển thị trực tiếp trên thanh đáy mobile (§7). */
  mobilePrimary?: boolean;
}

/** Thứ tự nhóm cố định — sidebar, rail và sheet đều sinh từ đây (§7). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard, group: "Theo dõi", mobilePrimary: true },
  {
    href: "/conversations",
    label: "Hội thoại",
    icon: MessageSquare,
    group: "Theo dõi",
    mobilePrimary: true,
  },
  { href: "/customers", label: "Khách hàng", icon: Users, group: "Danh bạ", mobilePrimary: true },
  {
    href: "/volume",
    label: "Lưu lượng & Hiệu suất",
    icon: BarChart2,
    group: "Phân tích",
  },
  { href: "/products", label: "Sản phẩm", icon: ShoppingBag, group: "Phân tích" },
  {
    href: "/knowledge",
    label: "Hệ thống & Tri thức",
    icon: Cpu,
    group: "Hệ thống",
  },
];

export interface NavGroup {
  name: string;
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
