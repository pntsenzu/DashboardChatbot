import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** true khi vào bằng nút "Xem thử với dữ liệu mẫu" — số liệu là dữ liệu mẫu. */
    user: { demo?: boolean } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Ghi trong `callbacks.jwt` khi đăng nhập qua provider `demo`. */
    demo?: boolean;
  }
}
