"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmt as tfmt } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";
import type { HeatmapCell } from "@/lib/types";

/** data-api §5: `weekday` 0=CN … 6=T7 — nhãn cột lấy theo locale. */
/** 24 cột giờ (00…23). */
const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** 8 nhãn trục giờ, mỗi nhãn phủ 3 cột. */
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21];
/** 6 bậc đậm nhạt cho thang xám trung tính (không dùng màu trạng thái). */
const STEPS = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85];

export interface HeatmapProps {
  /** Chỉ trả ô có dữ liệu (data-api §5) — ô thiếu coi là 0. */
  cells: HeatmapCell[];
  title: string;
  description?: string;
  className?: string;
}

/**
 * Heatmap thứ × giờ — tìm giờ cao điểm.
 *
 * Dùng thang **trung tính** (opacity của `--foreground`) thay vì màu thương hiệu
 * hay màu trạng thái: §3 “trung tính trước, màu sau” và §4 mỗi màu trạng thái
 * đúng một nghĩa. Ở dark mode độ đậm tự đảo chiều mà vẫn đọc đúng.
 *
 * Cột `< 640px` cuộn ngang trong khung (§16: bảng/ma trận không được tràn trang).
 */
export function Heatmap({ cells, title, description, className }: HeatmapProps) {
  const { t } = useI18n();
  const weekLabels = t.chart.weekdays;
  const key = (w: number, h: number) => `${w}:${h}`;
  const lookup = new Map<string, number>();
  for (const cell of cells) {
    if (cell.weekday < 0 || cell.weekday > 6 || cell.hour < 0 || cell.hour > 23) continue;
    lookup.set(key(cell.weekday, cell.hour), (lookup.get(key(cell.weekday, cell.hour)) ?? 0) + cell.count);
  }

  const max = Math.max(0, ...lookup.values());
  const nonZero = [...lookup.entries()]
    .map(([k, count]) => {
      const [w, h] = k.split(":").map(Number);
      return { weekday: w, hour: h, count };
    })
    .sort((a, b) => b.count - a.count);

  const alphaFor = (count: number) => {
    if (count <= 0 || max <= 0) return 0;
    const ratio = count / max;
    const step = Math.min(STEPS.length - 1, Math.floor(ratio * STEPS.length));
    return STEPS[step];
  };

  const top = nonZero[0];
  const label = nonZero.length
    ? tfmt(t.chart.heatmapSummary, {
        title,
        n: nonZero.length,
        max,
        when: `${weekLabels[top.weekday]} ${String(top.hour).padStart(2, "0")}:00`,
      })
    : tfmt(t.chart.heatmapSummaryEmpty, { title });

  return (
    <figure className={cn("m-0 space-y-3", className)}>
      <figcaption className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <span className="t-section block">{title}</span>
          {description ? <span className="t-meta block">{description}</span> : null}
        </div>
        {max > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xs tabular text-muted-foreground">0</span>
            <span className="flex gap-1" aria-hidden="true">
              {STEPS.map((a) => (
                <span
                  key={a}
                  className="size-3 rounded-[2px] border border-border/60"
                  style={{ backgroundColor: `hsl(var(--foreground) / ${a})` }}
                />
              ))}
            </span>
            <span className="text-2xs tabular text-muted-foreground">
              {tfmt(t.chart.heatmapMaxUnit, { max })}
            </span>
          </div>
        )}
      </figcaption>

      {nonZero.length === 0 ? (
        <p className="t-meta" role="status">
          {t.chart.heatmapEmpty}
        </p>
      ) : (
        <div
          role="img"
          aria-label={label}
          className="overflow-x-auto pb-1"
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="min-w-[620px] space-y-1">
            {/* Trục giờ */}
            <div className="grid grid-cols-[2rem_repeat(24,minmax(0,1fr))] items-end gap-1">
              <span aria-hidden="true" />
              {HOUR_TICKS.map((h) => (
                <span
                  key={h}
                  className="text-center text-2xs tabular text-muted-foreground"
                  style={{ gridColumn: "span 3" }}
                >
                  {h}h
                </span>
              ))}
            </div>

            {weekLabels.map((weekLabel, weekday) => (
              <div
                key={weekLabel}
                className="grid grid-cols-[2rem_repeat(24,minmax(0,1fr))] items-center gap-1"
              >
                <span className="text-2xs text-muted-foreground">{weekLabel}</span>
                {HOURS.map((hour) => {
                  const count = lookup.get(key(weekday, hour)) ?? 0;
                  const alpha = alphaFor(count);
                  return (
                    <span
                      key={hour}
                      title={
                        count > 0
                          ? `${weekLabel} ${String(hour).padStart(2, "0")}:00 · ${count} ${t.common.unit.message}`
                          : undefined
                      }
                      className="rounded-[2px] border border-border/40"
                      style={{
                        height: "clamp(10px,2vh,16px)",
                        backgroundColor:
                          alpha > 0 ? `hsl(var(--foreground) / ${alpha})` : "hsl(var(--muted) / 0.6)",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bảng số liệu thay thế: chỉ các ô có dữ liệu, xếp theo số tin giảm dần. */}
      {nonZero.length > 0 && (
        <table className="sr-only">
          <caption>{tfmt(t.chart.heatmapTableCaption, { title })}</caption>
          <thead>
            <tr>
              <th scope="col">{t.chart.heatmapWeekdayHeader}</th>
              <th scope="col">{t.chart.heatmapHourHeader}</th>
              <th scope="col">{t.chart.heatmapCountHeader}</th>
            </tr>
          </thead>
          <tbody>
            {nonZero.map((c) => (
              <tr key={`${c.weekday}-${c.hour}`}>
                <th scope="row">{weekLabels[c.weekday]}</th>
                <td>{String(c.hour).padStart(2, "0")}:00</td>
                <td>{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
