"use client";

import React from "react";

/**
 * Lỗi xảy ra ở ROOT LAYOUT (ví dụ getServerSession / env sai) không đi qua
 * app/error.tsx được — Next.js bắt buộc dùng file này. Nó thay thế luôn
 * <html>/<body> nên phải tự render đầy đủ.
 */
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
          background: "#fafafa",
          color: "#1a1a1a",
        }}
      >
        <div style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Dashboard gặp lỗi khi khởi tạo</h1>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
            Không đọc được cấu hình phiên đăng nhập hoặc máy chủ. Vui lòng kiểm tra{" "}
            <code>.env.local</code> (AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET) rồi thử lại.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#999" }}>Mã sự cố: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#171717",
              color: "#fff",
              fontSize: 14,
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
