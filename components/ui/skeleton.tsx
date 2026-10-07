import React from "react";
import { cn } from "@/lib/utils";

/**
 * Khung xương (Skeleton) — dùng cho trạng thái ĐANG TẢI (mục 13 UI Spec).
 * Luôn kèm aria-busy trên vùng bọc để không truyền nghĩa chỉ bằng màu.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** Vùng nội dung đang tải: hiện skeleton thay vì số 0. */
export function LoadingBlock({
  label = "Đang tải dữ liệu",
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn("space-y-3", className)}>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-6 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
