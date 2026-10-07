import React from "react";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authOptions, isGoogleConfigured, ALLOWED_EMAIL_DOMAIN } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/utils";
import { LoginClient } from "./login-client";

export const metadata = { title: "Đăng nhập · Senzu Chatbot Dashboard" };
export const dynamic = "force-dynamic";

/**
 * Mã lỗi chuẩn của NextAuth (mục 8 của docs). Bất kỳ giá trị lạ nào khác danh sách
 * này (vd: providerId "google" do NextAuth v4 đẩy lên khi GET /signin/<provider>)
 * đều KHÔNG phải lỗi thật -> không được báo cho người dùng.
 */
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Tài khoản của bạn không được cấp quyền. Chỉ địa chỉ email @senzu.co.jp đã xác minh mới được phép đăng nhập.",
  Configuration: "Hệ thống đăng nhập chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.",
  OAuthSignin: "Không khởi tạo được yêu cầu đăng nhập. Vui lòng thử lại.",
  OAuthCallback: "Google trả về lỗi khi hoàn tất đăng nhập. Vui lòng thử lại.",
  OAuthAccountNotLinked: "Tài khoản này chưa được liên kết. Hãy dùng email công ty Senzu.",
  OAuthCreateAccount: "Không tạo được tài khoản. Hãy dùng email công ty Senzu.",
  Callback: "Lỗi trong quá trình chuyển hướng đăng nhập. Vui lòng thử lại.",
  OAuthLoginRequired: "Phiên đăng nhập chưa hợp lệ. Vui lòng đăng nhập lại.",
  Default: "Đăng nhập không thành công. Vui lòng thử lại.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);

  const session = await getServerSession(authOptions);
  // Đã đăng nhập -> quay về đúng trang đích mà middleware đã giữ lại.
  if (session?.user) redirect(callbackUrl);

  const code = searchParams.error;
  const message =
    code && code in ERROR_MESSAGES
      ? ERROR_MESSAGES[code]
      : code
        ? // Giá trị lạ (không phải mã lỗi NextAuth) -> không hiển thị lỗi giả.
          null
        : null;

  // Khuôn trang F (§8): Logo h-12 → h1 + mô tả → Card rounded-xl p-6 → chân trang.
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo.png" alt="" width={48} height={48} priority className="size-12" />
          <div className="space-y-1">
            <h1 className="t-page">Đăng nhập Dashboard</h1>
            <p className="t-meta">
              Theo dõi tin nhắn, khách hàng và hiệu suất Chatbot Messenger
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs">
          {message && (
            <div
              role="alert"
              className="rounded-md border border-destructive-border bg-destructive-subtle p-3 text-sm text-destructive"
            >
              {message}
            </div>
          )}

          <LoginClient configured={isGoogleConfigured} callbackUrl={callbackUrl} />

          <p className="t-meta flex items-start justify-center gap-1.5 text-center">
            <ShieldCheck className="mt-0.5 size-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              Chỉ chấp nhận email <b className="text-foreground">{ALLOWED_EMAIL_DOMAIN}</b> đã xác
              minh bởi Google.
            </span>
          </p>
        </div>

        <p className="text-center text-2xs text-muted-foreground">Senzu Sale Hub · v1.0</p>
      </div>
    </div>
  );
}
