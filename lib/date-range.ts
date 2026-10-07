import type { GroupBy } from "@/lib/senzu-api";

/**
 * Khoảng thời gian cho trang Lưu lượng (bộ lọc ngày).
 *
 * Mọi phép tính theo **giờ Việt Nam (UTC+7, không có DST)** để khớp với dữ liệu
 * Data API (data-api §5: bucket theo giờ VN).
 */

export type RangePresetId =
  | "today"
  | "yesterday"
  | "last7"
  | "thisMonth"
  | "lastMonth"
  | "custom";

/** Thứ tự hiển thị của các nút bộ lọc. */
export const RANGE_PRESETS: RangePresetId[] = [
  "today",
  "yesterday",
  "last7",
  "thisMonth",
  "lastMonth",
  "custom",
];

export interface DateRange {
  preset: RangePresetId;
  /** Đầu kỳ (bao gồm). */
  sinceMs: number;
  /** Cuối kỳ (không bao gồm). */
  untilMs: number;
  /** Bước bucket cho `getVolume` — kỳ ≤ 48h thì theo giờ. */
  groupBy: GroupBy;
  /** true khi tham số tùy chọn không hợp lệ -> đã tự rơi về "7 ngày". */
  fallback?: boolean;
}

const DAY = 86_400_000;
const VN_OFFSET = 7 * 3_600_000;
/** Giới hạn của kỳ tùy chọn (để không tải cả thập kỷ). */
const MAX_CUSTOM_DAYS = 400;

/** 00:00 giờ VN của ngày chứa `ms`. */
export function startOfDayVN(ms: number): number {
  return Math.floor((ms + VN_OFFSET) / DAY) * DAY - VN_OFFSET;
}

/** 00:00 ngày mùng 1 (giờ VN) của tháng chứa `ms`. */
export function startOfMonthVN(ms: number): number {
  const day = new Date(startOfDayVN(ms) + VN_OFFSET);
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1) - VN_OFFSET;
}

/** `ms` -> chuỗi `YYYY-MM-DD` theo giờ VN (dùng cho input type="date"). */
export function toISODateVN(ms: number): string {
  const d = new Date(ms + VN_OFFSET);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** `YYYY-MM-DD` -> mốc 00:00 giờ VN; trả về NaN nếu không hợp lệ. */
function parseISODateVN(value: string | undefined): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  const parsed = Date.parse(`${value}T00:00:00+07:00`);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Chuyển `?range=&from=&to=` thành khoảng thời gian dùng được.
 * Tham số thiếu/sai -> rơi về "7 ngày gần nhất" (không bao giờ throw).
 */
export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  now: number = Date.now()
): DateRange {
  const preset = RANGE_PRESETS.includes(params.range as RangePresetId)
    ? (params.range as RangePresetId)
    : "last7";

  const endOfToday = startOfDayVN(now) + DAY;

  const build = (
    chosen: RangePresetId,
    sinceMs: number,
    untilMs: number,
    fallback = false
  ): DateRange => ({
    preset: chosen,
    sinceMs,
    untilMs,
    groupBy: untilMs - sinceMs <= 2 * DAY ? "hour" : "day",
    fallback,
  });

  switch (preset) {
    case "today":
      return build("today", startOfDayVN(now), endOfToday);
    case "yesterday":
      return build("yesterday", startOfDayVN(now) - DAY, startOfDayVN(now));
    case "thisMonth":
      return build("thisMonth", startOfMonthVN(now), endOfToday);
    case "lastMonth": {
      const thisMonth = startOfMonthVN(now);
      return build("lastMonth", startOfMonthVN(thisMonth - DAY), thisMonth);
    }
    case "custom": {
      const from = parseISODateVN(params.from);
      const to = parseISODateVN(params.to);
      const valid =
        Number.isFinite(from) &&
        Number.isFinite(to) &&
        from < to &&
        to - from <= MAX_CUSTOM_DAYS * DAY;
      if (!valid) return build("last7", now - 7 * DAY, now, true);
      return build("custom", from, to + DAY);
    }
    case "last7":
    default:
      return build("last7", now - 7 * DAY, now);
  }
}
