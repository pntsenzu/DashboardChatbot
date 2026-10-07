import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[380px] space-y-6">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-from to-brand-to text-white font-bold text-base grid place-items-center shadow-xs">
            S
          </div>
          <span className="t-page tracking-tight">SENZU · Chatbot</span>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card shadow-xs space-y-5">
          <div className="space-y-1 text-center">
            <h1 className="t-page">Đăng nhập Dashboard</h1>
            <p className="t-meta">Theo dõi tin nhắn, khách hàng và hiệu suất Chatbot Messenger</p>
          </div>

          {message && (
            <div
              role="alert"
              className="p-3 rounded-md border border-destructive-border bg-destructive-subtle text-destructive text-sm"
            >
              {message}
            </div>
          )}

          <LoginClient configured={isGoogleConfigured} callbackUrl={callbackUrl} />

          <p className="t-meta text-center text-[11px] leading-4">
            Chỉ chấp nhận email <b className="text-foreground">{ALLOWED_EMAIL_DOMAIN}</b> đã xác minh
            bởi Google.
          </p>
        </div>

        <p className="t-meta text-center text-[11px]">Senzu Sale Hub · v1.0</p>
      </div>
    </div>
  );
}
