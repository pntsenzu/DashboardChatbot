import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Trạng thái ĐANG TẢI (mục 13 UI Spec): skeleton khớp hình khối trang thật,
 * không phải spinner, không phải số 0.
 */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Đang tải trang</span>

      {/* Page header */}
      <div className="border-b border-border pb-4 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-72" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
            <Skeleton className="h-4 w-44" />
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} className="h-14 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
