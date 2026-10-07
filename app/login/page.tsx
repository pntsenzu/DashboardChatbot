import React from "react";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authOptions, isGoogleConfigured, ALLOWED_EMAIL_DOMAIN } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/utils";
import { getDict } from "@/lib/i18n-server";
import { LoginClient } from "./login-client";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: { absolute: getDict().login.metadataTitle } };
}

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
  const t = getDict();
  const message =
    code && code in t.login.errors
      ? t.login.errors[code as keyof typeof t.login.errors]
      : // Giá trị lạ (không phải mã lỗi NextAuth) -> không hiển thị lỗi giả.
        null;

  // Khuôn trang F (§8): Logo h-12 → h1 + mô tả → Card rounded-xl p-6 → chân trang.
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo.png" alt="" width={48} height={48} priority className="size-12" />
          <div className="space-y-1">
            <h1 className="t-page">{t.login.title}</h1>
            <p className="t-meta">{t.login.subtitle}</p>
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
              {t.login.emailNoteA}
              <b className="text-foreground">{ALLOWED_EMAIL_DOMAIN}</b>
              {t.login.emailNoteB}
            </span>
          </p>
        </div>

        <p className="text-center text-2xs text-muted-foreground">Senzu Sale Hub · v1.0</p>
      </div>
    </div>
  );
}
