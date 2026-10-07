import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "info" | "success" | "warning" | "destructive";

const BAR: Record<Tone, string> = {
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const DOT: Record<Tone, string> = {
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export interface TrendSeries {
  key: string;
  label: string;
  tone: Tone;
  /** Cùng độ dài với `categories`; `null` = thiếu dữ liệu ô này. */
  values: Array<number | null>;
}

export interface TrendChartProps {
  /** Nhãn trục X, vd ["01/10", "02/10", …]. */
  categories: string[];
  series: TrendSeries[];
  /** Tiêu đề bắt buộc — §16: biểu đồ luôn có tiêu đề. */
  title: string;
  /** Ghi chú dưới biểu đồ, vd "Tin khách gửi theo ngày (UTC+7)". */
  description?: string;
  unit?: string;
  className?: string;
}

/**
 * Biểu đồ cột nhóm — dùng cho chuỗi theo ngày.
 *
 * - Cột vẽ bằng div nên màu lấy trực tiếp từ token (đúng ở cả light/dark),
 *   không cần đọc CSS variable lúc runtime.
 * - Biểu đồ `aria-hidden`, kèm bảng số liệu thay thế đọc được bằng screen reader
 *   và `title` trên từng cột khi rê chuột.
 */
export function TrendChart({
  categories,
  series,
  title,
  description,
  unit = "",
  className,
}: TrendChartProps) {
  const max = Math.max(
    1,
    ...series.flatMap((s) => s.values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0)))
  );
  const hasData = series.some((s) => s.values.some((v) => typeof v === "number" && v > 0));
  const fmt = (v: number | null) => (typeof v === "number" && Number.isFinite(v) ? `${v.toLocaleString()}${unit}` : "—");

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <figure className={cn("m-0 space-y-3", className)}>
      <figcaption className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <span className="t-section block">{title}</span>
          {description ? <span className="t-meta block">{description}</span> : null}
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-sm", DOT[s.tone])} aria-hidden="true" />
              <span className="t-meta">{s.label}</span>
            </li>
          ))}
        </ul>
      </figcaption>

      {!hasData ? (
        <p className="t-meta" role="status">
          Chưa có số liệu trong kỳ để vẽ biểu đồ.
        </p>
      ) : (
        <div aria-hidden="true">
          <div className="relative h-40 border-b border-border">
            {gridLines.map((g) => (
              <span
                key={g}
                className="absolute inset-x-0 border-t border-border/70"
                style={{ bottom: `${g}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-end gap-1.5 px-1">
              {categories.map((cat, i) => (
                <div key={cat} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[3px]">
                  {series.map((s) => {
                    const value = s.values[i];
                    const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
                    const pct = Math.max(0, Math.min(100, (numeric / max) * 100));
                    if (pct === 0) return <span key={s.key} className="w-full max-w-6" />;
                    return (
                      <span
                        key={s.key}
                        title={`${cat} · ${s.label}: ${fmt(value)}`}
                        style={{ height: `${pct}%` }}
                        className={cn(
                          "w-full max-w-6 rounded-t-[2px] transition-opacity hover:opacity-70",
                          BAR[s.tone]
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <span className="absolute -top-1 right-0 text-2xs tabular text-muted-foreground">
              {max.toLocaleString()}
              {unit}
            </span>
          </div>

          <div className="mt-1 flex gap-1.5 px-1">
            {categories.map((cat) => (
              <span key={cat} className="min-w-0 flex-1 truncate text-center text-2xs tabular text-muted-foreground">
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bảng số liệu thay thế — đọc được bằng bàn phím / screen reader. */}
      <table className="sr-only">
        <caption>{title} — số liệu chi tiết</caption>
        <thead>
          <tr>
            <th scope="col">Thời điểm</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, i) => (
            <tr key={cat}>
              <th scope="row">{cat}</th>
              {series.map((s) => (
                <td key={s.key}>{fmt(s.values[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
