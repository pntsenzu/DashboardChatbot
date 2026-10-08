import "server-only";
import { rpc } from "@/lib/senzu-api";
import type {
  CustomerRow,
  HeatmapCell,
  LatencyStats,
  ProductMentionSummary,
  QuestionTypeCount,
  TopProductRow,
  UnknownProductMention,
} from "@/lib/types";

/**
 * Bù giới hạn KẾT THÚC kỳ cho các hàm Data API **chỉ nhận `sinceMs`**
 * (getHeatmap / getTopCustomers / getResponseLatency / getTopProducts…).
 *
 * ## Vấn đề (DEF-07, DEF-08)
 * Các hàm này trả số liệu từ `sinceMs` tới **hiện tại**, nên khi người dùng chọn
 * kỳ đã kết thúc ("Hôm qua", "Tháng trước", "Tùy chọn" trong quá khứ) thì
 * Heatmap / Top khách / KPI sản phẩm vẫn cộng dồn cả ngày nằm SAU ngày kết thúc —
 * một màn hình xuất hiện số liệu của hai khoảng thời gian khác nhau.
 *
 * ## Cách bù
 * Với kỳ `[since, until)` và `until < now`:
 *
 * ```
 * số_lượng_trong_kỳ = f(since) − f(until)
 * ```
 *
 * vì `f(x)` luôn đếm trên `[x, now)` và `[until, now) ⊂ [since, now)`:
 * - **Cộng dồn được** (số lượt, số tin, số ô heatmap…) -> chính xác tuyệt đối.
 * - **Riêng tập hợp** (khách duy nhất, p50/p90) -> không suy ra được, nên trả về
 *   giá trị thấp hơn thực (never overcount) hoặc `null` để UI hiện "—".
 *
 * Kỳ chưa kết thúc (`until >= now`) thì dữ liệu API đã nằm sẵn trong kỳ
 * -> chỉ gọi 1 lần, không đổi hành vi.
 */

/** Số tin nhắn quét để tìm lại "tin cuối trong kỳ" khi `lastTs` nằm ngoài kỳ. */
const RECENT_SCAN_LIMIT = 200;

/**
 * true khi `untilMs` đã nằm trong quá khứ -> API không lọc theo ngày kết thúc,
 * cần gọi thêm hàm `untilMs` rồi trừ.
 */
export function needsEndBound(untilMs: number, now: number = Date.now()): boolean {
  return untilMs < now;
}

/** Trừ có kiểm (`0` là giá trị thấp nhất, không bao giờ ra số âm). */
function subtract(value: number, tail: number | undefined): number {
  return Math.max(0, value - (tail ?? 0));
}

/** Ô heatmap theo `thứ:giờ` — khoá trùng lặp giữa hai lần gọi. */
function heatmapKey(cell: HeatmapCell): string {
  return `${cell.weekday}:${cell.hour}`;
}

/**
 * Heatmap đúng trong `[since, until)`: số ô là số tin (cộng dồn được) nên
 * `heat(since) − heat(until)` là chính xác.
 */
export async function getHeatmapInRange(
  sinceMs: number,
  untilMs: number,
  bounded: boolean
): Promise<HeatmapCell[]> {
  const from = await rpc("getHeatmap", sinceMs);
  if (!bounded) return from;

  const tail = await rpc("getHeatmap", untilMs);
  const tailCounts = new Map(tail.map((cell) => [heatmapKey(cell), cell.count]));
  return from
    .map((cell) => ({ ...cell, count: subtract(cell.count, tailCounts.get(heatmapKey(cell))) }))
    .filter((cell) => cell.count > 0);
}

/**
 * Top khách đúng trong `[since, until)`:
 * - `msgCount` = số tin trong kỳ (trừ đúng);
 * - `lastTs` = tin cuối **trong kỳ** — nếu tin cuối chung nằm sau ngày kết thúc
 *   thì quét `getRecentMessages` để lấy mốc trong kỳ; không tìm thấy -> `null`
 *   (UI hiện "—") thay vì hiển thị ngày ngoài kỳ.
 */
export async function getTopCustomersInRange(
  sinceMs: number,
  untilMs: number,
  limit: number,
  bounded: boolean
): Promise<CustomerRow[]> {
  const from = await rpc("getTopCustomers", sinceMs, limit);
  if (!bounded) return from;

  const tail = await rpc("getTopCustomers", untilMs, limit);
  const tailCounts = new Map(tail.map((row) => [row.senderId, row.msgCount]));
  const rows = from
    .map((row) => ({ ...row, msgCount: subtract(row.msgCount, tailCounts.get(row.senderId)) }))
    .filter((row) => row.msgCount > 0);

  const stale = rows.filter((row) => row.lastTs === null || row.lastTs >= untilMs);
  if (stale.length === 0) return rows;

  const recent = await rpc("getRecentMessages", RECENT_SCAN_LIMIT);
  const lastInPeriod = new Map<string, number>();
  for (const message of recent) {
    if (message.direction !== "incoming") continue;
    if (message.timestampMs < sinceMs || message.timestampMs >= untilMs) continue;
    const previous = lastInPeriod.get(message.senderId);
    if (previous === undefined || message.timestampMs > previous) {
      lastInPeriod.set(message.senderId, message.timestampMs);
    }
  }

  return rows.map((row) =>
    row.lastTs !== null && row.lastTs >= untilMs
      ? { ...row, lastTs: lastInPeriod.get(row.senderId) ?? null }
      : row
  );
}

/**
 * Độ trễ đúng trong `[since, until)`:
 * - `avgMs` suy ra từ tổng thời gian (`avg × matched`), trừ hai lần gọi -> chính xác;
 * - `medianMs` / `p90Ms` **không** cộng dồn được -> `null` (UI hiện "—") thay vì
 *   đưa số của kỳ khác vào.
 */
export async function getLatencyInRange(
  sinceMs: number,
  untilMs: number,
  bounded: boolean
): Promise<LatencyStats> {
  const from = await rpc("getResponseLatency", sinceMs);
  if (!bounded) return from;

  const tail = await rpc("getResponseLatency", untilMs);
  const matchedCount = subtract(from.matchedCount, tail.matchedCount);
  const incomingCount = subtract(from.incomingCount, tail.incomingCount);

  const fromSum = from.avgMs != null ? from.avgMs * from.matchedCount : null;
  const tailSum = tail.avgMs != null ? tail.avgMs * tail.matchedCount : null;
  const avgMs =
    matchedCount > 0 && fromSum != null
      ? Math.max(0, Math.round((fromSum - (tailSum ?? 0)) / matchedCount))
      : null;

  return { matchedCount, incomingCount, avgMs, medianMs: null, p90Ms: null };
}

/** Tổng lượt hỏi sản phẩm đúng trong `[since, until)`. */
export async function getProductMentionSummaryInRange(
  sinceMs: number,
  untilMs: number,
  bounded: boolean
): Promise<ProductMentionSummary> {
  const from = await rpc("getProductMentionSummary", sinceMs);
  if (!bounded) return from;

  const tail = await rpc("getProductMentionSummary", untilMs);
  const total = subtract(from.total, tail.total);
  const resolved = subtract(from.resolved, tail.resolved);
  const unresolved = subtract(from.unresolved, tail.unresolved);
  return {
    total,
    resolved,
    unresolved,
    unresolvedRate: total > 0 ? unresolved / total : null,
  };
}

/**
 * Top sản phẩm đúng trong `[since, until)`.
 * `mentionCount` trừ chính xác; `uniqueCustomers` là ước tính DƯỚI (khách nhắc ở
 * cả hai cửa sổ sẽ bị trừ hết) — không bao giờ phóng to số khách ngoài kỳ.
 */
export async function getTopProductsInRange(
  sinceMs: number,
  untilMs: number,
  limit: number,
  bounded: boolean
): Promise<TopProductRow[]> {
  const from = await rpc("getTopProducts", sinceMs, limit);
  if (!bounded) return from;

  const tail = await rpc("getTopProducts", untilMs, limit);
  const tailByProduct = new Map(tail.map((row) => [row.productId, row]));
  return from
    .map((row) => {
      const t = tailByProduct.get(row.productId);
      return {
        ...row,
        mentionCount: subtract(row.mentionCount, t?.mentionCount),
        uniqueCustomers: subtract(row.uniqueCustomers, t?.uniqueCustomers),
      };
    })
    .filter((row) => row.mentionCount > 0);
}

/** Phân bổ loại câu hỏi đúng trong `[since, until)` (giống top sản phẩm). */
export async function getProductQuestionBreakdownInRange(
  sinceMs: number,
  untilMs: number,
  bounded: boolean,
  productId?: string
): Promise<QuestionTypeCount[]> {
  const from = await rpc("getProductQuestionBreakdown", sinceMs, productId);
  if (!bounded) return from;

  const tail = await rpc("getProductQuestionBreakdown", untilMs, productId);
  const tailByType = new Map(tail.map((row) => [row.questionType, row]));
  return from
    .map((row) => {
      const t = tailByType.get(row.questionType);
      return {
        ...row,
        count: subtract(row.count, t?.count),
        uniqueCustomers: subtract(row.uniqueCustomers, t?.uniqueCustomers),
      };
    })
    .filter((row) => row.count > 0);
}

/** Tên sản phẩm ngoài catalog nhắc trong `[since, until)`. */
export async function getUnknownProductMentionsInRange(
  sinceMs: number,
  untilMs: number,
  limit: number,
  bounded: boolean
): Promise<UnknownProductMention[]> {
  const from = await rpc("getUnknownProductMentions", sinceMs, limit);
  if (!bounded) return from;

  const tail = await rpc("getUnknownProductMentions", untilMs, limit);
  const tailByName = new Map(tail.map((row) => [row.normalizedName, row.count]));
  return from
    .map((row) => ({ ...row, count: subtract(row.count, tailByName.get(row.normalizedName)) }))
    .filter((row) => row.count > 0);
}
