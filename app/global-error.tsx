"use client";

import React from "react";

/**
 * Lỗi xảy ra ở ROOT LAYOUT (ví dụ getServerSession / env sai) không đi qua
 * app/error.tsx được — Next.js bắt buộc dùng file này. Nó thay thế luôn
 * <html>/<body> nên phải tự render đầy đủ.
 *
 * Vì thay thế luôn root layout nên app/globals.css KHÔNG được nạp -> không dùng
 * được Tailwind class hay CSS variable. Dùng trực tiếp cùng giá trị HSL của token
 * (phụ lục §17) để màu vẫn khớp giao diện bình thường.
 */
const TOKENS = {
  background: "hsl(220 20% 97.5%)",
  foreground: "hsl(222 25% 11%)",
  card: "hsl(0 0% 100%)",
  border: "hsl(220 14% 90%)",
  mutedForeground: "hsl(220 9% 42%)",
  primary: "hsl(137 70% 29%)",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
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
            Dashboard gặp lỗi khi khởi tạo
          </h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: TOKENS.mutedForeground, margin: 0 }}>
            Không đọc được cấu hình phiên đăng nhập hoặc máy chủ. Vui lòng kiểm tra{" "}
            <code>.env.local</code> (AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET) rồi thử lại.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, lineHeight: "20px", color: TOKENS.mutedForeground }}>
              Mã sự cố: {error.digest}
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
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
