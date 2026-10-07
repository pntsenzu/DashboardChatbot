"use client";

import React from "react";
import { DICT, DEFAULT_LOCALE, resolveLocale, type Locale } from "@/lib/i18n";

/**
 * Lỗi xảy ra ở ROOT LAYOUT (ví dụ getServerSession / env sai) không đi qua
 * app/error.tsx được — Next.js bắt buộc dùng file này. Nó thay thế luôn
 * <html>/<body> nên phải tự render đầy đủ.
 *
 * Vì thay thế luôn root layout nên app/globals.css KHÔNG được nạp -> không dùng
 * được Tailwind class hay CSS variable. Dùng trực tiếp cùng giá trị HSL của token
 * (phụ lục §17) để màu vẫn khớp giao diện bình thường.
 *
 * I18nProvider cũng đã bị thay thế -> tự đọc cookie `senzu-locale`.
 */
const TOKENS = {
  background: "hsl(220 20% 97.5%)",
  foreground: "hsl(222 25% 11%)",
  card: "hsl(0 0% 100%)",
  border: "hsl(220 14% 90%)",
  mutedForeground: "hsl(220 9% 42%)",
  primary: "hsl(137 70% 29%)",
};

/** Đọc cookie ngôn ngữ phía client (giây đầu render vẫn là tiếng Việt). */
function localeFromCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(/(?:^|;\s*)senzu-locale=(vi|ja)(?:;|$)/);
  return resolveLocale(match?.[1]);
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = React.useState<Locale>(DEFAULT_LOCALE);

  React.useEffect(() => {
    setLocale(localeFromCookie());
  }, []);

  const t = DICT[locale];

  return (
    <html lang={t.htmlLang}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: TOKENS.background,
          color: TOKENS.foreground,
        }}
      >
        <div style={{ maxWidth: 480, padding: 24, textAlign: "center" }} role="alert">
          <h1 style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600, margin: "0 0 8px" }}>
            {t.states.globalErrorTitle}
          </h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: TOKENS.mutedForeground, margin: 0 }}>
            {t.states.globalErrorA}
            <code>.env.local</code>
            {t.states.globalErrorB}
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, lineHeight: "20px", color: TOKENS.mutedForeground }}>
              {t.states.incidentCode} {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              height: 36,
              padding: "0 16px",
              borderRadius: 6,
              border: "none",
              background: TOKENS.primary,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {t.common.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
