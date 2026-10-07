"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeApiError } from "@/lib/api-error";
import { useI18n } from "@/components/i18n-provider";

/**
 * Trạng thái LỖI (mục 13 UI Spec): nêu rõ lỗi + nút "Thử lại",
 * KHÔNG hiển thị như "chưa có dữ liệu" và KHÔNG hiện KPI = 0.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t } = useI18n();

  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center py-10">
      <div
        role="alert"
        className="max-w-[520px] w-full p-6 rounded-lg border border-destructive-border bg-destructive-subtle space-y-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="t-section text-destructive">{t.states.errorTitle}</h1>
            <p className="t-meta text-destructive/90">{describeApiError(error, locale)}</p>
            <p className="t-meta text-destructive/70">{t.states.errorNote}</p>
          </div>
        </div>

        {error.digest && (
          <p className="t-meta text-2xs tabular">
            {t.states.incidentCode} <code className="font-mono">{error.digest}</code>
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="default" size="sm" onClick={reset}>
            <RefreshCw className="w-3.5 h-3.5" /> {t.common.retry}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.assign("/")}
          >
            {t.states.notFoundAction}
          </Button>
        </div>
      </div>
    </div>
  );
}
