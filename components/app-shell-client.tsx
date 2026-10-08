"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronsUpDown,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, MOBILE_PRIMARY, activeHref, type NavItem } from "@/lib/modules";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";

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

/* ------------------------------------------------------------------ *
 * Trạng thái bot — mỗi màu đúng một nghĩa (§4), luôn kèm chữ (§15)   *
 * ------------------------------------------------------------------ */
function BotStatusBadge({ stale }: { stale: boolean | null }) {
  const { t } = useI18n();
  // Badge dùng chung primitive (§9): mỗi tone một nghĩa, luôn kèm chữ (§15).
  if (stale === null) {
    return <Badge variant="default">{t.shell.botUnknown}</Badge>;
  }
  if (stale) {
    return (
      <Badge variant="destructive">
        <AlertTriangle aria-hidden="true" /> {t.shell.botStopped}
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      <CheckCircle2 aria-hidden="true" /> {t.shell.botOnline}
    </Badge>
  );
}

/* ------------------------------------------------------------------ *
 * Mục điều hướng — dùng cho cả sidebar, rail, thanh đáy và sheet     *
 * ------------------------------------------------------------------ */
function NavLink({
  item,
  active,
  count,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
}) {
  const { t } = useI18n();
  const Icon = item.icon;
  const label = t.nav[item.id];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors coarse:h-11",
        // rail (768–1023): icon 44px; desktop (≥1024): đầy đủ
        "md:w-11 md:px-0 lg:w-full lg:justify-start lg:gap-2.5 lg:px-2.5",
        active
          ? "bg-card text-foreground shadow-xs ring-1 ring-border"
          : "text-sidebar-foreground/80 hover:bg-card/70 hover:text-foreground"
      )}
    >
      <Icon
        className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <span className="hidden min-w-0 flex-1 truncate lg:block">{label}</span>
      {count ? (
        <Badge variant="warning" className="hidden tabular lg:inline-flex">
          {count}
        </Badge>
      ) : null}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Tài khoản — avatar + menu đăng xuất (§7)                            *
 * ------------------------------------------------------------------ */
function AccountMenu({
  user,
  compact = false,
  className,
}: {
  user?: ShellUser | null;
  /** true: chỉ avatar (rail / top bar); false: avatar + tên + email + chevron. */
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.shell.account}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11",
          compact && "w-9 justify-center px-0"
        )}
      >
        <span
          className="grid size-8 flex-shrink-0 place-items-center rounded-full border border-border bg-accent text-xs font-semibold text-accent-foreground"
          aria-hidden="true"
        >
          {initials(user)}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-sidebar-foreground">
              {user?.name || t.shell.userFallback}
            </span>
            <span className="block truncate t-meta">{user?.email}</span>
          </span>
        )}
        {!compact && <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full z-40 mb-1 min-w-[200px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <div className="border-b border-border px-2.5 py-2">
            <p className="truncate text-sm font-medium">{user?.name || t.shell.userFallback}</p>
            <p className="truncate t-meta">{user?.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 flex h-9 w-full items-center gap-2 rounded-sm px-2.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11"
          >
            <LogOut className="size-4" aria-hidden="true" /> {t.shell.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sheet "Khác" — bottom sheet cho mobile (§7)                          *
 * ------------------------------------------------------------------ */
function MoreSheet({
  open,
  onClose,
  pathname,
  active,
  attentionCount,
  stale,
  user,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  active: string;
  attentionCount: number;
  stale: boolean | null;
  user?: ShellUser | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  // Đóng sheet khi đổi trang.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={t.shell.navOther}
      className="m-auto mt-auto w-full max-w-full rounded-t-xl border border-border bg-card p-0 shadow-lg [&::backdrop]:bg-black/50"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="t-section">{t.shell.nav}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.shell.close}
          className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label={t.shell.navOther} className="max-h-[60vh] overflow-y-auto p-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.name} className="mt-3 first:mt-0">
            <p className="t-overline px-2.5 py-1">{t.navGroup[group.name]}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onClose}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-[18px] text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{t.nav[item.id]}</span>
                  {item.href === "/conversations" && attentionCount > 0 ? (
                    <Badge variant="warning" className="tabular">
                      {attentionCount}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <BotStatusBadge stale={stale} />
          <LocaleSwitcher />
        </div>
        <AccountMenu user={user} />
      </div>
    </dialog>
  );
}

/* ------------------------------------------------------------------ *
 * Khung ứng dụng                                                     *
 * ------------------------------------------------------------------ */
export function AppShellClient({
  children,
  openAttentionCount = 0,
  botStatusIsStale = null,
  user = null,
  mockMode = false,
}: AppShellProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  // Trang đăng nhập có layout riêng, không bọc sidebar/header.
  if (pathname === "/login") return <>{children}</>;

  const active = activeHref(pathname);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("senzu-theme", next);
    } catch {
      /* localStorage bị chặn -> bỏ qua, theme vẫn áp cho phiên này */
    }
    setTheme(next);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {/* Skip link — hiện khi focus, trỏ tới #main (§7) */}
      <a
        href="#main"
        className="sr-only rounded-md bg-card px-3 py-2 text-sm shadow-md focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t.shell.skipLink}
      </a>

      {/* Sidebar: rail 64px ở md (768–1023), đầy đủ 240px ở lg (≥1024) */}
      <aside className="hidden h-full flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex md:w-16 lg:w-60">
        {/* Brand: logo cao 56px (§7) */}
        <div className="flex h-14 flex-shrink-0 items-center justify-center gap-2.5 border-b border-sidebar-border px-3 lg:justify-start lg:px-4">
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            priority
            className="size-8 rounded"
            aria-hidden="true"
          />
          <span className="hidden h-5 w-px bg-sidebar-border lg:block" aria-hidden="true" />
          <span className="hidden truncate text-sm font-semibold text-foreground lg:block">
            Senzu Chatbot
          </span>
        </div>

        {/* Điều hướng */}
        <nav
          aria-label={t.shell.navMain}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-4 pt-2 lg:px-3"
        >
          {NAV_GROUPS.map((group) => (
            <div
              key={group.name}
              className="mt-5 border-t border-sidebar-border pt-3 first:mt-0 first:border-t-0 first:pt-0 lg:mt-5 lg:border-t-0 lg:pt-0"
            >
              <p className="t-overline hidden px-2.5 pb-1 lg:block">{t.navGroup[group.name]}</p>
              <div className="flex flex-col items-center gap-1 lg:items-stretch">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={active === item.href}
                    count={item.href === "/conversations" ? openAttentionCount : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Tài khoản ở đáy sidebar */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-3">
          <div className="mb-2 hidden px-1 lg:flex lg:items-center lg:justify-between">
            <BotStatusBadge stale={botStatusIsStale} />
            <span className="t-meta">v1.0</span>
          </div>
          <div className="hidden lg:block">
            <AccountMenu user={user} />
          </div>
          <div className="flex justify-center lg:hidden">
            <AccountMenu user={user} compact />
          </div>
        </div>
      </aside>

      {/* Cột chính */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Dữ liệu mẫu (chỉ hiện khi chưa cấu hình DATA_API_TOKEN) */}
        {mockMode && (
          <div
            role="status"
            className="flex items-center gap-2 border-b border-warning-border bg-warning-subtle px-4 py-2 text-xs font-medium text-warning sm:px-6 lg:px-8"
          >
            <AlertTriangle className="size-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              {t.shell.mockA}
              <b>{t.shell.mockStrong}</b>
              {t.shell.mockB}
              <code>DATA_API_TOKEN</code>
              {t.shell.mockC}
            </span>
          </div>
        )}

        {/* Thanh trên (§7) */}
        <header className="z-20 flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-card px-4 shadow-xs sm:px-6 lg:px-8">
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="size-7 rounded md:hidden"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground sm:text-lg">
              Senzu Sale Hub Chatbot
            </p>
            <p className="t-meta hidden truncate sm:block">{t.shell.subtitle}</p>
          </div>

          <BotStatusBadge stale={botStatusIsStale} />

          <div className="flex items-center gap-2">
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "light" ? t.shell.themeToDark : t.shell.themeToLight}
              className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11"
            >
              {theme === "light" ? (
                <Moon className="size-3.5" aria-hidden="true" />
              ) : (
                <Sun className="size-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {theme === "light" ? t.shell.themeDark : t.shell.themeLight}
              </span>
            </button>

            {/* Tài khoản: compact trên top bar (mobile không có sidebar) */}
            <div className="md:hidden">
              <AccountMenu user={user} compact />
            </div>
          </div>
        </header>

        {/* Vùng nội dung: CHỈ main cuộn (§7)
            `relative` để <main> làm containing block cho các phần tử tuyệt đối
            bên trong (sr-only, gridline…) — nếu không chúng lấy ICB, nằm dưới
            đáy khung nhìn và làm trang cuộn ra vùng trống ở dưới. */}
        <main
          id="main"
          tabIndex={-1}
          className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden outline-none"
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
            {children}
          </div>
        </main>

        {/* Thanh điều hướng đáy mobile (§7) */}
        <nav
          aria-label={t.shell.navQuick}
          className="flex flex-shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {MOBILE_PRIMARY.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-2xs transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden="true" />
                )}
                <Icon className="size-5" aria-hidden="true" />
                <span className="truncate px-1">{t.nav[item.id]}</span>
                {item.href === "/conversations" && openAttentionCount > 0 ? (
                  <span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-warning-subtle px-1 text-2xs font-semibold tabular text-warning ring-1 ring-warning-border">
                    {openAttentionCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-2xs text-muted-foreground transition-colors"
          >
            <Menu className="size-5" aria-hidden="true" />
            <span>{t.shell.more}</span>
          </button>
        </nav>
      </div>

      <MoreSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        pathname={pathname}
        active={active}
        attentionCount={openAttentionCount}
        stale={botStatusIsStale}
        user={user}
      />
    </div>
  );
}
