import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDict } from "@/lib/i18n-server";

/** Skeleton cho bảng danh sách (hội thoại / khách hàng). */
export default function ConversationsLoading() {
  const t = getDict();

  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">{t.common.loadingList}</span>

      <div className="border-b border-border pb-4 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-64" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-56" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden p-3 space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
