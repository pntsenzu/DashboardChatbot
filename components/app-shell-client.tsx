"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  BarChart2, 
  ShoppingBag, 
  Cpu, 
  Sun, 
  Moon, 
  CheckCircle2,
  AlertTriangle,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShellUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface AppShellProps {
  children: React.ReactNode;
  openAttentionCount?: number;
  /** null = không tải được trạng thái -> hiển thị "không rõ", không giả vờ khoẻ. */
  botStatusIsStale?: boolean | null;
  user?: ShellUser | null;
  /** true = chưa cấu hình DATA_API_TOKEN, toàn bộ số liệu là dữ liệu mẫu. */
  mockMode?: boolean;
}

function initials(user?: ShellUser | null): string {
  const source = user?.name || user?.email || "SV";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "S").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export function AppShellClient({
  children,
  openAttentionCount = 0,
  botStatusIsStale = null,
  user = null,
  mockMode = false,
}: AppShellProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Trang đăng nhập có layout riêng, không bọc sidebar/header.
  if (pathname === "/login") return <>{children}</>;


  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navItems = [
    { label: "Tổng quan", href: "/", icon: LayoutDashboard },
    { label: "Hội thoại", href: "/conversations", icon: MessageSquare },
    { label: "Khách hàng", href: "/customers", icon: Users },
    { label: "Lưu lượng & Hiệu suất", href: "/volume", icon: BarChart2 },
    { label: "Sản phẩm", href: "/products", icon: ShoppingBag },
    { label: "Hệ thống & Tri thức", href: "/knowledge", icon: Cpu },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-60 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border z-30 hidden md:flex">
        {/* Brand */}
        <div className="h-14 flex items-center gap-2.5 px-4 flex-shrink-0 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(138,72%,34%)] to-[hsl(136,53%,28%)] text-white font-bold text-sm grid place-items-center shadow-xs">
            S
          </div>
          <span className="t-section text-foreground tracking-tight">SENZU · Chatbot</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="t-overline px-2.5 pt-2 pb-1">Điều hướng</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sidebar-foreground/80 hover:bg-card/70 hover:text-foreground text-sm font-medium transition-colors",
                  isActive && "bg-card text-foreground font-semibold shadow-xs border border-border"
                )}
              >
                <Icon className={cn("w-4 h-4 text-muted-foreground", isActive && "text-primary")} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/conversations" && openAttentionCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning-subtle text-warning border border-warning-border">
                    {openAttentionCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="t-meta flex items-center gap-1.5">
              {botStatusIsStale === null ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Không rõ trạng thái
                </>
              ) : botStatusIsStale ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Bot ngắt kết nối
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Bot đang chạy
                </>
              )}
            </span>
            <span className="t-meta">v1.0</span>
          </div>
          <div className="t-meta text-[11px] px-1">
            Chỉ chấp nhận email @senzu.co.jp
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Dữ liệu mẫu (chỉ hiện khi chưa cấu hình DATA_API_TOKEN) */}
        {mockMode && (
          <div
            role="status"
            className="px-4 sm:px-8 py-2 bg-warning-subtle border-b border-warning-border text-xs font-medium text-warning flex items-center gap-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              Đang hiển thị <b>dữ liệu mẫu</b> — chưa cấu hình <code>DATA_API_TOKEN</code>. Số liệu
              không phải dữ liệu thật.
            </span>
          </div>
        )}
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 flex items-center gap-4 px-4 sm:px-8 bg-card border-b border-border shadow-xs">
          <div className="flex-1 flex items-center gap-3">
            <h1 className="t-page text-lg font-semibold tracking-tight">Senzu Sale Hub Chatbot</h1>
            {botStatusIsStale === null ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                Không rõ trạng thái
              </span>
            ) : botStatusIsStale ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive-subtle text-destructive border border-destructive-border">
                <AlertTriangle className="w-3.5 h-3.5" /> Bot dừng
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-subtle text-success border border-success-border">
                <CheckCircle2 className="w-3.5 h-3.5" /> Trực tuyến
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng"}
              className="h-8 px-2.5 rounded-md border border-input bg-card text-foreground hover:bg-muted text-xs font-medium flex items-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{theme === "light" ? "Tối" : "Sáng"}</span>
            </button>
            {user?.email ? (
              <span className="hidden sm:inline t-meta max-w-[200px] truncate" title={user.email}>
                {user.name || user.email}
              </span>
            ) : null}
            <div
              className="w-8 h-8 rounded-full bg-accent text-accent-foreground font-semibold text-xs grid place-items-center border border-border"
              aria-hidden="true"
            >
              {initials(user)}
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="h-8 px-2.5 rounded-md border border-input bg-card text-foreground hover:bg-muted text-xs font-medium flex items-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-[1240px] w-full mx-auto px-4 sm:px-8 py-6 pb-20">
          {children}
        </main>
      </div>
    </div>
  );
}
