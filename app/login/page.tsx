import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, isGoogleConfigured, ALLOWED_EMAIL_DOMAIN } from "@/lib/auth";
import { LoginClient } from "./login-client";

export const metadata = { title: "Đăng nhập · Senzu Chatbot Dashboard" };
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Tài khoản của bạn không được cấp quyền. Chỉ địa chỉ email @senzu.co.jp đã xác minh mới được phép đăng nhập.",
  Configuration: "Hệ thống đăng nhập chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.",
  OAuthAccountNotLinked: "Tài khoản này chưa được liên kết. Hãy dùng email công ty Senzu.",
  Default: "Đăng nhập không thành công. Vui lòng thử lại.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");

  const message = searchParams.error ? ERROR_MESSAGES[searchParams.error] ?? ERROR_MESSAGES.Default : null;

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

          <LoginClient configured={isGoogleConfigured} />

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
