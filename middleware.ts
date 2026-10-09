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

/**
 * Kiểm tra thread CÓ tồn tại trên Data API (DEF-02).
 *
 * Trang /conversations/[id] phải trả HTTP 404 thật cho id không tồn tại, nhưng
 * `loading.tsx` stream shell với status 200 trước khi `notFound()` trong page
 * chạy được -> kiểm tra ở middleware (TRƯỚC khi render) để status 404 là thật,
 * URL giữ nguyên và vẫn hiển thị trang 404 có thương hiệu.
 *
 * Trả `null` (không kết luận được) khi thiếu cấu hình hoặc API lỗi -> FAIL OPEN:
 * cho render trang như bình thường, page-level `notFound()` vẫn giữ nội dung 404.
 */
async function conversationExists(id: string): Promise<boolean | null> {
  return threadRpcExists("getConversationMessages", id);
}

/** Kiểm tra khách hàng CÓ tồn tại trên Data API (cùng cách DEF-02 cho hội thoại). */
async function customerExists(id: string): Promise<boolean | null> {
  return threadRpcExists("getCustomerDetail", id);
}

/** Gọi 1 hàm RPC đơn giản để kiểm tra bản ghi còn tồn tại không. */
async function threadRpcExists(
  fn: "getConversationMessages" | "getCustomerDetail",
  id: string
): Promise<boolean | null> {
  const url = process.env.DATA_API_URL?.trim().replace(/\/+$/, "");
  const token = process.env.DATA_API_TOKEN?.trim();
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fn, args: [id] }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown };
    // Hội thoại rỗng = không tồn tại; khách hàng null = không tồn tại.
    if (fn === "getConversationMessages") return Array.isArray(data.result) && data.result.length > 0;
    return data.result !== null && data.result !== undefined;
  } catch {
    return null;
  }
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

  // Cần đăng nhập khi đã cấu hình Google OAuth hoặc ở production;
  // chưa cấu hình + development -> cho phép truy cập (như trước đây).
  const requireAuth = authConfigured || process.env.NODE_ENV === "production";
  if (requireAuth && !token) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?callbackUrl=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(login);
  }

  // Chi tiết hội thoại / khách hàng: id không tồn tại -> 404 thật (DEF-02),
  // giữ nguyên URL. Bỏ qua ở chế độ DEMO — id mẫu (cus_demo_*, thr_demo_*)
  // không tồn tại trên Data API thật.
  const isDemo = token?.demo === true;

  const detail = pathname.match(/^\/conversations\/([^/]+)\/?$/);
  if (detail && !isDemo) {
    let id = detail[1];
    try {
      id = decodeURIComponent(id);
    } catch {
      /* percent-encoding hỏng -> giữ nguyên id gốc */
    }
    if ((await conversationExists(id)) === false) {
      // Rewrite tới route không tồn tại -> Next render not-found.tsx (có thương hiệu)
      // với status 404 thật, URL vẫn là /conversations/<id>.
      return NextResponse.rewrite(new URL("/khong-ton-tai", req.url));
    }
  }

  const customerDetail = pathname.match(/^\/customers\/([^/]+)\/?$/);
  if (customerDetail && !isDemo) {
    let id = customerDetail[1];
    try {
      id = decodeURIComponent(id);
    } catch {
      /* percent-encoding hỏng -> giữ nguyên id gốc */
    }
    if ((await customerExists(id)) === false) {
      return NextResponse.rewrite(new URL("/khong-ton-tai", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Bỏ qua static asset, API auth và trang đăng nhập.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
