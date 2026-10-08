"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, toISODateVN, type RangePresetId } from "@/lib/date-range";
import { useI18n } from "@/components/i18n-provider";

interface DateRangeFilterProps {
  /** Kỳ đang chọn (đã được server resolve). */
  preset: RangePresetId;
  /** Đầu/cuối kỳ dùng để điền sẵn ô "Tùy chọn" (chuỗi YYYY-MM-DD). */
  from: string;
  to: string;
  /** Trang đang gắn bộ lọc — preset và form GET đều trỏ về trang này. */
  basePath?: string;
  className?: string;
}

/**
 * Bộ lọc ngày cho báo cáo: Hôm nay · Hôm qua · 7 ngày · 30 ngày · Tháng này · Tháng trước · Tùy chọn.
 *
 * - Nút preset dùng `router.push` -> URL là nguồn sự thật (refresh/Back đều đúng).
 * - Ô đang chọn `bg-accent` + `aria-pressed` (§11).
 * - Ô "Tùy chọn" là form GET thuần -> vẫn chạy khi JavaScript chưa tải.
 */
export function DateRangeFilter({
  preset,
  from,
  to,
  basePath = "/volume",
  className,
}: DateRangeFilterProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [draftFrom, setDraftFrom] = React.useState(from);
  const [draftTo, setDraftTo] = React.useState(to);

  // Đồng bộ lại khi server trả kỳ mới (Back/Forward, preset khác).
  React.useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to]);

  const LABEL: Record<RangePresetId, string> = {
    today: t.range.today,
    yesterday: t.range.yesterday,
    last7: t.range.last7,
    last30: t.range.last30,
    thisMonth: t.range.thisMonth,
    lastMonth: t.range.lastMonth,
    custom: t.range.custom,
  };

  const hrefFor = (id: RangePresetId) =>
    id === "custom" && from && to
      ? `${basePath}?range=custom&from=${from}&to=${to}`
      : `${basePath}?range=${id}`;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="group"
        aria-label={t.range.label}
        className="flex flex-wrap items-center gap-1.5"
      >
        {RANGE_PRESETS.map((id) => {
          const active = preset === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => router.push(hrefFor(id))}
              className={cn(
                "h-8 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11",
                active
                  ? "border-primary/30 bg-accent text-accent-foreground"
                  : "border-input bg-card text-foreground shadow-xs hover:bg-muted"
              )}
            >
              {LABEL[id]}
            </button>
          );
        })}
      </div>

      {preset === "custom" && (
        <form
          method="GET"
          action={basePath}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="range" value="custom" />
          <label className="flex flex-col gap-1 t-meta">
            {t.range.from}
            <input
              type="date"
              name="from"
              value={draftFrom}
              max={toISODateVN(Date.now())}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11"
            />
          </label>
          <label className="flex flex-col gap-1 t-meta">
            {t.range.to}
            <input
              type="date"
              name="to"
              value={draftTo}
              max={toISODateVN(Date.now())}
              onChange={(e) => setDraftTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11"
            />
          </label>
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11"
          >
            {t.range.apply}
          </button>
        </form>
      )}
    </div>
  );
}
