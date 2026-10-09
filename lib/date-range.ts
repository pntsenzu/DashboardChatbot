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
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

/** Thứ tự hiển thị của các nút bộ lọc. */
export const RANGE_PRESETS: RangePresetId[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
  "custom",
];

/** Kỳ mặc định của `resolveRange` khi URL chưa chọn (hoặc chọn sai) kỳ. */
export type DefaultRangePreset = Extract<RangePresetId, "last7" | "last30">;

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
 * Tham số thiếu/sai -> rơi về `defaultPreset` (7 ngày, hoặc 30 ngày nếu
 * trang truyền vào) — không bao giờ throw.
 */
export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  now: number = Date.now(),
  defaultPreset: DefaultRangePreset = "last7"
): DateRange {
  const preset = RANGE_PRESETS.includes(params.range as RangePresetId)
    ? (params.range as RangePresetId)
    : defaultPreset;

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

  /** Kỳ mặc định: 7 hay 30 ngày tùy `defaultPreset`. */
  const buildDefault = (fallback = false): DateRange =>
    defaultPreset === "last30"
      ? build("last30", now - 30 * DAY, now, fallback)
      : build("last7", now - 7 * DAY, now, fallback);

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
      // `from <= to`: từ == đến là kỳ HỢP LỆ (một ngày). Chỉ từ chối khi đảo ngày
      // (from > to) hoặc kéo quá dài — trước đây `from < to` vô tình chặn luôn
      // kỳ một ngày, làm nút "Tùy chọn" từ "Hôm nay"/"Hôm qua" rơi về mặc định.
      const valid =
        Number.isFinite(from) &&
        Number.isFinite(to) &&
        from <= to &&
        to - from <= MAX_CUSTOM_DAYS * DAY;
      if (!valid) return buildDefault(true);
      // `to` bao gồm (bao cả ngày kết thúc) -> đầu kỳ kế tiếp là 00:00 ngày sau `to`.
      return build("custom", from, to + DAY);
    }
    // Hai kỳ có mốc bắt đầu cố định phải tự build — không rơi về `defaultPreset`,
    // nếu không `/products` (mặc định 30 ngày) sẽ nhảy lại 30 ngày khi bấm "7 ngày".
    case "last30":
      return build("last30", now - 30 * DAY, now);
    case "last7":
      return build("last7", now - 7 * DAY, now);
    default:
      return buildDefault();
  }
}

/**
 * Liệt kê **mọi ngày** (giờ VN) trong kỳ `[sinceMs, untilMs)` dạng `YYYY-MM-DD`.
 *
 * Data API trả trend theo ngày ở dạng *sparse* (chỉ ngày có dữ liệu) — biểu đồ
 * phải tự bù ngày 0, nếu không trục X chỉ hiện vài mốc trong kỳ (DEF-14).
 */
export function daysInPeriodISOVN(
  sinceMs: number,
  untilMs: number,
  maxDays = MAX_CUSTOM_DAYS
): string[] {
  const days: string[] = [];
  for (
    let ms = startOfDayVN(sinceMs);
    ms < untilMs && days.length < maxDays;
    ms += DAY
  ) {
    days.push(toISODateVN(ms));
  }
  return days;
}

/**
 * Bù ngày 0 cho trend sparse: mọi ngày trong kỳ đều có một dòng, ngày nào API
 * không trả thì dùng `blank`. Mảng đầu vào rỗng vẫn trả về rỗng — để trang hiện
 * EmptyState thay vì vẽ biểu đồ toàn số 0 (DEF-14).
 */
export function fillDailyTrend<T extends { date: string }>(
  rows: T[],
  sinceMs: number,
  untilMs: number,
  blank: Omit<T, "date">,
  maxDays = MAX_CUSTOM_DAYS
): T[] {
  if (rows.length === 0) return [];
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return daysInPeriodISOVN(sinceMs, untilMs, maxDays).map(
    (date) => ({ date, ...(byDate.get(date) ?? blank) }) as T
  );
}
