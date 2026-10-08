"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmt as tfmt } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";

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

/** Màu nét cho dạng đường — `stroke-*` lấy đúng token màu như `bg-*`. */
const STROKE: Record<Tone, string> = {
  primary: "stroke-primary",
  info: "stroke-info",
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
};

/** Dạng hiển đồ: cột (mặc định) hoặc đường — đổi bằng nhóm nút `aria-pressed`. */
type ChartView = "bar" | "line";

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

/** Nút chọn kiểu đồ — cùng bộ style với nút preset của DateRangeFilter (§11). */
const TOGGLE_BTN =
  "h-8 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11";
const TOGGLE_ON = "border-primary/30 bg-accent text-accent-foreground";
const TOGGLE_OFF = "border-input bg-card text-foreground shadow-xs hover:bg-muted";

/**
 * Biểu đồ chuỗi theo ngày — đổi qua lại giữa dạng **cột** và dạng **đường**
 * bằng nhóm nút góc phải caption (trạng thái `aria-pressed`).
 *
 * - Cột vẽ bằng div nên màu lấy trực tiếp từ token (đúng ở cả light/dark),
 *   không cần đọc CSS variable lúc runtime.
 * - Dạng đường: polyline trong SVG (`preserveAspectRatio="none"` +
 *   `vector-effect="non-scaling-stroke"` để nét không méo) + chấm tròn đặt
 *   đúng toạ độ; toạ độ X tính một lần cho đường, chấm và nhãn (căn đều hai
 *   bên, không tràn khung). Điểm `null` làm đứt đoạn — không nối bừa.
 * - Biểu đồ `aria-hidden`, kèm bảng số liệu thay thế đọc được bằng screen reader
 *   và `title` trên từng cột / chấm khi rê chuột.
 */
export function TrendChart({
  categories,
  series,
  title,
  description,
  unit = "",
  className,
}: TrendChartProps) {
  const { t } = useI18n();
  const [view, setView] = React.useState<ChartView>("bar");
  const max = Math.max(
    1,
    ...series.flatMap((s) => s.values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0)))
  );
  const hasData = series.some((s) => s.values.some((v) => typeof v === "number" && v > 0));
  const fmt = (v: number | null) => (typeof v === "number" && Number.isFinite(v) ? `${v.toLocaleString()}${unit}` : "—");

  const gridLines = [0, 25, 50, 75, 100];
  const n = categories.length;

  // Toạ độ X (% của khung vẽ) cho dạng đường: chia đều có lề để nhãn mép
  // không bị cắt; lề thu về khi nhiều điểm để không bỏ trống quá nhiều.
  const inset = n <= 1 ? 50 : Math.min(14, Math.max(4, 48 / (n - 0.04)));
  const xAt = (i: number) => (n <= 1 ? 50 : inset + (i / (n - 1)) * (100 - 2 * inset));
  const labelW = n <= 1 ? 90 : ((100 - 2 * inset) / (n - 1)) * 0.96;
  /** % từ đáy khung (0 = đáy) — cùng hệ với chiều cao cột ở dạng cột. */
  const yPct = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));

  /** Đoạn polyline liên tục qua các điểm hợp lệ; `null` -> đứt đoạn. */
  const segmentsOf = (values: Array<number | null>): Array<Array<[number, number]>> => {
    const segs: Array<Array<[number, number]>> = [];
    let cur: Array<[number, number]> = [];
    values.forEach((v, i) => {
      if (typeof v === "number" && Number.isFinite(v)) {
        cur.push([xAt(i), 100 - yPct(v)]);
      } else if (cur.length > 0) {
        if (cur.length > 1) segs.push(cur);
        cur = [];
      }
    });
    if (cur.length > 1) segs.push(cur);
    return segs;
  };

  return (
    <figure className={cn("m-0 space-y-3", className)}>
      <figcaption className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <span className="t-section block">{title}</span>
          {description ? <span className="t-meta block">{description}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-sm", DOT[s.tone])} aria-hidden="true" />
                <span className="t-meta">{s.label}</span>
              </li>
            ))}
          </ul>
          {hasData ? (
            <div role="group" aria-label={t.chart.viewLabel} className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={view === "bar"}
                onClick={() => setView("bar")}
                className={cn(TOGGLE_BTN, view === "bar" ? TOGGLE_ON : TOGGLE_OFF)}
              >
                {t.chart.viewBar}
              </button>
              <button
                type="button"
                aria-pressed={view === "line"}
                onClick={() => setView("line")}
                className={cn(TOGGLE_BTN, view === "line" ? TOGGLE_ON : TOGGLE_OFF)}
              >
                {t.chart.viewLine}
              </button>
            </div>
          ) : null}
        </div>
      </figcaption>

      {!hasData ? (
        <p className="t-meta" role="status">
          {t.chart.empty}
        </p>
      ) : (
        <div aria-hidden="true">
          {/* Cao bám theo viewport: trang dài không bị đẩy nội dung ra ngoài màn hình. */}
          <div className="relative h-[clamp(140px,22vh,240px)] border-b border-border">
            {gridLines.map((g) => (
              <span
                key={g}
                className="absolute inset-x-0 border-t border-border/70"
                style={{ bottom: `${g}%` }}
              />
            ))}

            {view === "bar" ? (
              <div className="absolute inset-0 flex items-end gap-1.5 px-1">
                {categories.map((cat, i) => (
                  <div key={cat} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[3px]">
                    {series.map((s) => {
                      const value = s.values[i];
                      const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
                      const pct = yPct(numeric);
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
            ) : (
              <>
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  focusable="false"
                >
                  {series.map((s) =>
                    segmentsOf(s.values).map((seg, si) => (
                      <polyline
                        key={`${s.key}-${si}`}
                        points={seg.map(([x, y]) => `${x},${y}`).join(" ")}
                        fill="none"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className={STROKE[s.tone]}
                      />
                    ))
                  )}
                </svg>
                <div className="absolute inset-0">
                  {categories.map((cat, i) =>
                    series.map((s) => {
                      const value = s.values[i];
                      if (typeof value !== "number" || !Number.isFinite(value)) return null;
                      return (
                        <span
                          key={`${s.key}-${i}`}
                          title={`${cat} · ${s.label}: ${fmt(value)}`}
                          style={{ left: `${xAt(i)}%`, bottom: `${yPct(value)}%` }}
                          className={cn(
                            "absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-background transition-opacity hover:opacity-70",
                            DOT[s.tone]
                          )}
                        />
                      );
                    })
                  )}
                </div>
              </>
            )}

            <span className="absolute -top-1 right-0 text-2xs tabular text-muted-foreground">
              {max.toLocaleString()}
              {unit}
            </span>
          </div>

          {view === "bar" ? (
            <div className="mt-1 flex gap-1.5 px-1">
              {categories.map((cat) => (
                <span key={cat} className="min-w-0 flex-1 truncate text-center text-2xs tabular text-muted-foreground">
                  {cat}
                </span>
              ))}
            </div>
          ) : (
            /* Nhãn cùng toạ độ X với đường + chấm; overflow-hidden cắt phần
               nhãn mép tràn ra ngoài khung (chữ căn giữa nên không bị mất). */
            <div className="relative mt-1 h-5 overflow-hidden">
              {categories.map((cat, i) => (
                <span
                  key={cat}
                  style={{ left: `${xAt(i)}%`, width: `${labelW}%` }}
                  className="absolute top-0 -translate-x-1/2 truncate text-center text-2xs tabular text-muted-foreground"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bảng số liệu thay thế — đọc được bằng bàn phím / screen reader.
          sr-only bọc ở DIV vì <table> không co về 1px được: bảng vẫn giữ kích
          thước thật, tràn khỏi khung và làm trang cuộn thêm vùng trống ở dưới. */}
      <div className="sr-only">
        <table>
          <caption>{tfmt(t.chart.tableCaption, { title })}</caption>
          <thead>
            <tr>
              <th scope="col">{t.chart.timeHeader}</th>
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
      </div>
    </figure>
  );
}
