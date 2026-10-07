import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Chỉ nhân viên Senzu (@senzu.co.jp) mới được phép đăng nhập.
 * Quy tắc này lấy từ UI Design Spec (NextAuth Google Provider Rule).
 */
export const ALLOWED_EMAIL_DOMAIN = "@senzu.co.jp";

/** True khi cả GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET đã được cấu hình. */
export const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

export const authOptions: NextAuthOptions = {
  providers: isGoogleConfigured
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
      ]
    : [],
  // Không dùng database adapter -> JWT trong cookie.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * Chặn mọi email ngoài @senzu.co.jp và mọi email chưa được Google xác minh
     * (email_verified !== true). Trả về false -> NextAuth chuyển sang
     * /login?error=AccessDenied.
     */
    async signIn({ user, profile }) {
      const raw = (profile ?? {}) as { email?: string; email_verified?: unknown };
      const email = (user.email ?? raw.email ?? "").trim().toLowerCase();
      const verified = raw.email_verified === true;

      if (!email) {
        console.warn("[auth] Tu choi dang nhap: khong co email trong profile.");
        return false;
      }
      if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
        console.warn(`[auth] Tu choi dang nhap: email khong thuoc ${ALLOWED_EMAIL_DOMAIN}.`);
        return false;
      }
      if (!verified) {
        console.warn(`[auth] Tu choi dang nhap: email chưa xac minh (email_verified !== true): ${email}`);
        return false;
      }
      return true;
    },
    /** Luôn quay về trang gốc sau khi đăng nhập, kể cả URL tương đối. */
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        /* url không hợp lệ -> rơi về trang gốc */
      }
      return baseUrl;
    },
  },
};
