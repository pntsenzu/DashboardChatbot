"use client";

import * as React from "react";
import { DICT, DEFAULT_LOCALE, type Dict, type Locale } from "@/lib/i18n";

interface I18nValue {
  locale: Locale;
  t: Dict;
}

const I18nContext = React.createContext<I18nValue | null>(null);

/**
 * Gói toàn bộ app bằng từ điển của ngôn ngữ hiện tại (đọc từ cookie ở server).
 * Client component lấy chuỗi dịch qua `useI18n()`; server component dùng
 * `getDict()` từ `lib/i18n-server.ts`.
 */
export function I18nProvider({
  locale,
  t,
  children,
}: I18nValue & { children: React.ReactNode }) {
  const value = React.useMemo(() => ({ locale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = React.useContext(I18nContext);
  if (!value) {
    // Không có provider -> dùng tiếng Việt, không làm sập trang.
    return { locale: DEFAULT_LOCALE, t: DICT[DEFAULT_LOCALE] };
  }
  return value;
}
