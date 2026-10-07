"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";

const LOCALE_LABEL: Record<Locale, string> = { vi: "VI", ja: "日本語" };

/**
 * Bộ chọn ngôn ngữ — lưu cookie `senzu-locale` rồi `router.refresh()` để server
 * render lại bằng từ điển mới (URL không đổi).
 * Dạng segmented control: ô đang chọn `bg-accent` + `aria-pressed` (§11).
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const pick = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <div
      role="group"
      aria-label={t.shell.language}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-input bg-card p-0.5 shadow-xs",
        className
      )}
    >
      {LOCALES.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            disabled={pending}
            onClick={() => pick(item)}
            className={cn(
              "h-7 min-w-9 rounded px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 coarse:h-11",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {LOCALE_LABEL[item]}
          </button>
        );
      })}
    </div>
  );
}
