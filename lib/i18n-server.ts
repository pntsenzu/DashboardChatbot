import { cookies } from "next/headers";
import {
  DICT,
  LOCALE_COOKIE,
  resolveLocale,
  type Dict,
  type Locale,
} from "@/lib/i18n";

/**
 * Đọc ngôn ngữ hiện tại từ cookie `senzu-locale` (server component).
 * Chỉ dùng ở phía server — client component dùng `useI18n()` của
 * `components/i18n-provider.tsx`.
 */
export function getLocale(): Locale {
  return resolveLocale(cookies().get(LOCALE_COOKIE)?.value);
}

/** Từ điển của ngôn ngữ hiện tại. */
export function getDict(): Dict {
  return DICT[getLocale()];
}
