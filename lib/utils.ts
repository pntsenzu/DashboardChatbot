import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Chấp nhận callbackUrl an toàn (chống open redirect).
 * Chỉ giữ lại đường dẫn cùng origin: "/path" (không bắt đầu "//" hay "/\")
 * hoặc URL tuyệt đối trùng origin với NEXTAUTH_URL / NEXTAUTH_URL fallback.
 * Mọi giá trị khác -> "/".
 */
export function safeCallbackUrl(raw?: string | null): string {
  const fallback = "/";
  if (!raw) return fallback;

  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* giữ nguyên nếu không phải percent-encoding hợp lệ */
  }

  // Relative path: "/foo" nhưng không phải "//evil.com" hay "/\evil.com".
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) {
    return value;
  }

  // URL tuyệt đối: chỉ cho qua khi trùng origin được khai báo.
  try {
    const url = new URL(value);
    const allowed = [
      process.env.NEXTAUTH_URL,
      process.env.AUTH_URL,
      "http://localhost:3000",
    ].filter(Boolean) as string[];
    if (allowed.some((base) => new URL(base).origin === url.origin)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    /* không phải URL -> rơi về fallback */
  }

  return fallback;
}

export type DateLocale = "vi-VN" | "ja-JP";

/** Định dạng số theo locale (`vi-VN` -> 1.234, `ja-JP` -> 1,234). */
export function formatNumber(value: number, locale: DateLocale = "vi-VN"): string {
  return value.toLocaleString(locale);
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatDateTime(
  ms: number | null | undefined,
  locale: DateLocale = "vi-VN"
): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateShort(
  ms: number | null | undefined,
  locale: DateLocale = "vi-VN"
): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  });
}
