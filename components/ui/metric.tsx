"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MetricGrid & Metric — ô KPI (§11).
 * - Một khung liền `grid gap-px bg-border` -> ô ngăn bằng hairline, KHÔNG bọc
 *   mỗi con số trong Card riêng.
 * - 2 cột mobile -> `sm:grid-cols-*` (override được qua className).
 * - Ô bấm được là một `<button>`/`<Link>` phủ toàn ô; không lồng control trong
 *   control (§15) — nút phụ trong ô phải đặt `z-10`.
 * - Không có số -> truyền `"—"` / "Chưa tải được", KHÔNG BAO GIỜ hiện 0.
 */
export function MetricGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4",
        className
      )}
      {...props}
    />
  );
}

export interface MetricProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Trạng thái phụ (mẫu số, ghi chú) — luôn `t-meta`. */
  meta?: React.ReactNode;
  /** Đường sparkline dưới giá trị (§11 gợi ý kèm xu hướng). */
  sparkline?: React.ReactNode;
  /** Đang chọn (ô đóng vai trò bộ lọc). */
  active?: boolean;
  onClick?: () => void;
  /** Biến ô thành liên kết (trang liên quan) — hiện › khi hover/focus. */
  href?: string;
  className?: string;
  /** Tô tone cho giá trị — chỉ dùng tone trạng thái. */
  valueClassName?: string;
}

export function Metric({
  label,
  value,
  meta,
  sparkline,
  active = false,
  onClick,
  href,
  className,
  valueClassName,
}: MetricProps) {
  const interactive = Boolean(onClick || href);

  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="t-meta min-w-0 truncate">{label}</span>
        {interactive ? (
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className={cn("t-metric tabular truncate", valueClassName)}>{value}</span>
      {sparkline}
      {meta ? <span className="t-meta truncate">{meta}</span> : null}
    </>
  );

  const classes = cn(
    "group flex min-w-0 flex-col gap-0.5 bg-card px-4 py-3.5 text-left transition-colors",
    active && "bg-accent",
    interactive &&
      "cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    !interactive && "cursor-default",
    className
  );

  if (href) {
    return (
      <Link href={href} aria-pressed={active || undefined} className={classes}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" aria-pressed={active} onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}
