import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "info" | "success" | "warning" | "destructive" | "muted";

const STROKE: Record<Tone, string> = {
  primary: "stroke-primary",
  info: "stroke-info",
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  muted: "stroke-muted-foreground",
};

const FILL: Record<Tone, string> = {
  primary: "fill-primary/12",
  info: "fill-info/12",
  success: "fill-success/12",
  warning: "fill-warning/12",
  destructive: "fill-destructive/12",
  muted: "fill-muted-foreground/10",
};

export interface SparklineProps {
  /** Chuỗi số theo thời gian; `null` = thiếu dữ liệu (bị loại khỏi đường). */
  data: Array<number | null | undefined>;
  /** Mô tả cho trình đọc màn hình, vd "Tỉ lệ trả lời theo 7 ngày". */
  label: string;
  tone?: Tone;
  className?: string;
  /** Cao (px) — mặc định 28. */
  height?: number;
  /** Đơn vị khi đọc giá trị, vd "%", "ms". */
  unit?: string;
}

/**
 * Sparkline — đường + nền mờ cho KPI (§11: số liệu luôn kèm nhãn, không thay
 * bằng biểu đồ vì không đọc được bằng bàn phím: chart có `role="img"` + tóm tắt
 * và bảng số liệu thay thế ở trang chủ biểu đồ).
 *
 * Vẽ SVG thuần (không lib biểu đồ) để màu luôn lấy từ token -> tự đúng ở dark mode.
 */
export function Sparkline({
  data,
  label,
  tone = "primary",
  className,
  height = 28,
  unit = "",
}: SparklineProps) {
  const values = data.filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const summary = () => {
    if (values.length < 2) return `${label}: chưa đủ dữ liệu`;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const last = values[values.length - 1];
    const fmt = (n: number) =>
      `${Number.isInteger(n) ? n : n.toFixed(1)}${unit}`;
    return `${label}: ${values.length} mốc, thấp nhất ${fmt(min)}, cao nhất ${fmt(max)}, mới nhất ${fmt(last)}`;
  };

  if (values.length < 2) {
    return (
      <p className={cn("t-meta", className)} role="img" aria-label={summary()}>
        Chưa đủ dữ liệu
      </p>
    );
  }

  const W = 100;
  const H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = coords.join(" ");
  const area = `0,${H} ${line} ${W},${H}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={summary()}
      style={{ height }}
      className={cn("block w-full", className)}
    >
      <polygon points={area} className={FILL[tone]} />
      <polyline
        points={line}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={STROKE[tone]}
      />
    </svg>
  );
}
