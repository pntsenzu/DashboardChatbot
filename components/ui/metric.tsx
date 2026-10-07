"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * MetricGrid & Metric — ô KPI (§11).
 * Ô bấm được là bộ lọc: dùng <button> bọc toàn ô, không lồng control trong
 * control (§15) — các nút phụ nằm trong ô phải đặt `z-10`.
 */
function MetricGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
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

interface MetricProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Trạng thái phụ (xu hướng, ghi chú) — luôn `.t-meta`. */
  meta?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  /** Màu cho giá trị: chỉ dùng tone trạng thái, KHÔNG dùng màu mặc định lung tung. */
  valueClassName?: string;
}

function Metric({
  label,
  value,
  meta,
  active = false,
  onClick,
  className,
  valueClassName,
}: MetricProps) {
  const body = (
    <>
      <span className="t-meta truncate">{label}</span>
      <span className={cn("t-metric tabular truncate", valueClassName)}>{value}</span>
      {meta ? <span className="t-meta truncate">{meta}</span> : null}
    </>
  );

  const classes = cn(
    "flex min-w-0 flex-col gap-0.5 bg-card px-4 py-4 text-left transition-colors",
    active && "bg-accent",
    onClick &&
      "cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    className
  );

  if (onClick) {
    return (
      <button type="button" aria-pressed={active} onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}

export { MetricGrid, Metric };
