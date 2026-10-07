"use client";

import React from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

interface LoginClientProps {
  configured: boolean;
  /** Trang đích middleware đã giữ lại (đã qua safeCallbackUrl). */
  callbackUrl: string;
}

export function LoginClient({ configured, callbackUrl }: LoginClientProps) {
  const { t } = useI18n();

  if (!configured) {
    return (
      <div className="p-3 rounded-md border border-warning-border bg-warning-subtle text-warning text-sm space-y-1">
        <p className="font-semibold">{t.login.notConfiguredTitle}</p>
        <p className="t-meta text-warning/90">
          {t.login.notConfiguredBodyA}
          <code>GOOGLE_CLIENT_ID</code>
          {t.login.notConfiguredBodyB}
          <code>GOOGLE_CLIENT_SECRET</code>
          {t.login.notConfiguredBodyC}
          <code>.env.local</code>
          {t.login.notConfiguredBodyD}
          <code>.apps.googleusercontent.com</code>
          {t.login.notConfiguredBodyE}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="default"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 4.2-5.35 4.2a5.9 5.9 0 1 1 0-11.8c1.5 0 2.85.55 3.9 1.45l2.15-2.15A8.9 8.9 0 1 0 12 20.9c4.45 0 8.55-3.2 8.55-8.8 0-.35-.05-.7-.1-1z"
          />
        </svg>
        {t.login.continueGoogle}
      </Button>
      {callbackUrl !== "/" && (
        <p className="text-center text-2xs text-muted-foreground">{t.login.redirectNote}</p>
      )}
    </div>
  );
}
