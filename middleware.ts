import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Chưa cấu hình Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET):
 * ở development cho phép truy cập để team UI làm việc được với dữ liệu mẫu;
 * ở production chặn toàn bộ để không bao giờ lộ dữ liệu khi quên cấu hình.
 */
const authConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

/** Phần mở rộng file tĩnh được phép truy cập không cần đăng nhập. */
const STATIC_FILE_RE = /\.(png|jpe?g|gif|svg|webp|ico|avif|txt|xml|json|css|js|map|webmanifest|woff2?|ttf)$/i;

/**
 * Chỉ nhận callbackUrl cùng origin, chặn open redirect.
 * Nhẹ hơn safeCallbackUrl() của lib/utils vì middleware chạy ở edge.
 */
function safeCallback(raw: string | null): string {
  if (!raw) return "/";
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    /* không phải percent-encoding hợp lệ -> giữ nguyên */
  }
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  try {
    const url = new URL(value);
    const base = process.env.NEXTAUTH_URL;
    if (base && url.origin === new URL(base).origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    /* không phải URL -> rơi về "/" */
  }
  return "/";
}

export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // File tĩnh trong /public (logo, favicon, robots, font…) -> Next phục vụ trực tiếp,
  // KHÔNG đi qua kiểm tra đăng nhập. Nếu redirect thì next/image optimizer
  // (nó fetch /logo.png nội bộ) sẽ nhận HTML thay vì ảnh và trả 400.
  if (STATIC_FILE_RE.test(pathname)) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  // Đã đăng nhập mà vào /login -> quay về trang đích.
  // Xử lý tại đây (trước khi render) để trả 307 thật; nếu để redirect() trong
  // trang thì loading.tsx đã stream sẵn status 200 nên không đổi được nữa.
  if (pathname === "/login") {
    if (token) {
      const target = safeCallback(req.nextUrl.searchParams.get("callbackUrl"));
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  if (!authConfigured && process.env.NODE_ENV !== "production") return NextResponse.next();

  if (!token) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?callbackUrl=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Bỏ qua static asset, API auth và trang đăng nhập.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
