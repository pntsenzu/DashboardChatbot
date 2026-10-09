import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

/** Tên cookie session của NextAuth (bản https dùng tiền tố `__Secure-`). */
const SESSION_COOKIES = ["__Secure-next-auth.session-token", "next-auth.session-token"];

/**
 * true khi phiên hiện tại vào bằng nút **"Xem thử với dữ liệu mẫu"** (chế độ demo).
 *
 * Trong chế độ demo mọi số liệu là DỮ LIỆU MẪU hard-code — `rpc()` trả mẫu
 * thay vì gọi Data API thật, nên demo:
 * - không cần tài khoản Google, không cần DATA_API_TOKEN;
 * - chạy được cả ở production (ai bấm nút cũng xem được, nhưng chỉ thấy dữ liệu mẫu);
 * - không bao giờ lộ dữ liệu khách thật.
 */
export const isDemoSession = cache(async (): Promise<boolean> => {
  try {
    const jar = cookies();
    const raw = SESSION_COOKIES.map((name) => jar.get(name)?.value).find(Boolean);
    if (!raw) return false;
    const payload = await decode({
      token: raw,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "",
    });
    return payload?.demo === true;
  } catch {
    // Ngoài request scope (prerender) hoặc cookie hỏng -> không phải demo.
    return false;
  }
});
