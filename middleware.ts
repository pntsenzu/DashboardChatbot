import { withAuth } from "next-auth/middleware";

/**
 * Chưa cấu hình Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET):
 * ở development cho phép truy cập để team UI làm việc được với dữ liệu mẫu;
 * ở production chặn toàn bộ để không bao giờ lộ dữ liệu khi quên cấu hình.
 */
const authConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ token, req }) {
      const { pathname } = req.nextUrl;
      if (pathname === "/login") return true;
      if (!authConfigured && process.env.NODE_ENV !== "production") return true;
      return Boolean(token);
    },
  },
});

export const config = {
  // Bỏ qua static asset, API auth và trang đăng nhập.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
