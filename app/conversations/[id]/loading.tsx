import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDict } from "@/lib/i18n-server";

/** Skeleton cho khung chat chi tiết hội thoại. */
export default function ConversationDetailLoading() {
  const t = getDict();

  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">{t.common.loadingConversation}</span>

      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56" />
        </div>
      </div>

      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-4">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
            <Skeleton className="h-16 w-[70%]" />
          </div>
        ))}
      </div>
    </div>
  );
}
