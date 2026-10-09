import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * Chỉ nhân viên Senzu (@senzu.co.jp) mới được phép đăng nhập.
 * Quy tắc này lấy từ UI Design Spec (NextAuth Google Provider Rule).
 */
export const ALLOWED_EMAIL_DOMAIN = "@senzu.co.jp";

/** True khi cả GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET đã được cấu hình. */
export const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

/** Cờ bật tính năng Test Login (chỉ cho dev/staging) */
export const isTestLoginEnabled = Boolean(
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_TEST_LOGIN === "true" &&
  process.env.TEST_LOGIN_KEY?.trim()
);

export const authOptions: NextAuthOptions = {
  providers: [
    ...(isGoogleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
    ...(isTestLoginEnabled
      ? [
          CredentialsProvider({
            name: "Test Login",
            credentials: {
              key: { label: "Test Login Key", type: "password" },
            },
            async authorize(credentials) {
              if (
                credentials?.key &&
                credentials.key === process.env.TEST_LOGIN_KEY
              ) {
                return {
                  id: "test-user-1",
                  name: "Test User",
                  email: "test" + ALLOWED_EMAIL_DOMAIN, // vd: test@senzu.co.jp
                };
              }
              return null;
            },
          }),
        ]
      : []),
    /**
     * Chế độ DEMO — "Xem thử với dữ liệu mẫu".
     *
     * Không cần tài khoản, không cần mật khẩu, LUÔN bật (kể cả production):
     * người xem chỉ thấy DỮ LIỆU MẪU hard-code (`rpc()` trả mẫu khi phiên có
     * cờ `demo`), không gọi Data API thật nên không lộ dữ liệu khách hàng.
     */
    CredentialsProvider({
      id: "demo",
      name: "Xem thử dữ liệu mẫu",
      credentials: {},
      async authorize() {
        return {
          id: "demo-user",
          name: "Khách tham quan",
          email: "demo@demo.local",
        };
      },
    }),
  ],
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
    async signIn({ user, profile, account }) {
      // Chế độ demo: vào bằng nút "Xem thử với dữ liệu mẫu" — không có email thật.
      if (account?.provider === "demo") {
        return true;
      }

      // Cho phép test user từ credentials provider
      if (isTestLoginEnabled && account?.provider === "credentials" && user.id === "test-user-1") {
        return true;
      }

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
    /** Gắn cờ `demo` vào token -> `rpc()` biết phải trả dữ liệu mẫu. */
    async jwt({ token, account }) {
      if (account?.provider === "demo") token.demo = true;
      return token;
    },
    /** Đưa cờ `demo` ra session để UI hiện banner "chế độ demo". */
    async session({ session, token }) {
      if (token.demo === true && session.user) session.user.demo = true;
      return session;
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
