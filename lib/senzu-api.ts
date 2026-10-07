import "server-only";
import { DataApiError, type DataApiErrorKind } from "@/lib/api-error";
import type {
  AiInsightCounts,
  AttentionItem,
  ConversationListItem,
  ConversationMessage,
  ConversationStatus,
  ConversationVolumePoint,
  CustomerActivityPoint,
  CustomerActivityStats,
  CustomerDetail,
  CustomerInterest,
  CustomerListItem,
  CustomerListRow,
  CustomerNote,
  CustomerPurchaseSignal,
  CustomerRow,
  CustomerSummary,
  DailyPerformancePoint,
  HeatmapCell,
  InterestSignalPoint,
  InterestStatus,
  LatencyStats,
  MessageProcessing,
  PeriodStats,
  ProductMentionSummary,
  QuestionTypeCount,
  RecentConversation,
  RecentMessage,
  SystemStatus,
  TopProductRow,
  UnknownProductMention,
  VolumePoint,
} from "@/lib/types";

/** Nhóm thời gian hợp lệ của `getVolume` / `getCustomersPerBucket`. */
export type GroupBy = "day" | "hour";

/** Tham số của `getConversations` (data-api §6). */
export interface ConversationQuery {
  search?: string;
  status?: ConversationStatus;
  limit: number;
}

/** Tham số của `getCustomersWithInterest` (data-api §6). */
export interface CustomerQuery {
  search?: string;
  status?: InterestStatus;
  limit: number;
}

/**
 * Chữ ký của toàn bộ 36 hàm đọc + 1 hàm ghi của Senzu Data API (data-api §6).
 * Bảng này là nguồn sự thật về kiểu tham số/kết quả: `rpc("getPeriodStats", a, b)`
 * sẽ trả về `Promise<PeriodStats>` và từ chối tên hàm sai ngay lúc type-check.
 */
export interface RpcMap {
  // 1. Tổng quan & hệ thống
  getPeriodStats: { args: [sinceMs: number, untilMs: number]; result: PeriodStats };
  getDailyPerformanceTrend: {
    args: [sinceMs: number, untilMs: number];
    result: DailyPerformancePoint[];
  };
  getAiInsightCounts: { args: [sinceMs: number, untilMs: number]; result: AiInsightCounts };
  getCustomersPerBucket: {
    args: [sinceMs: number, groupBy: GroupBy, untilMs?: number];
    result: VolumePoint[];
  };
  getAttentionItems: { args: [limit: number]; result: AttentionItem[] };
  getRecentConversations: { args: [limit: number]; result: RecentConversation[] };
  getOpenAttentionCount: { args: []; result: number };
  getSystemStatus: { args: []; result: SystemStatus };

  // 2. Lưu lượng & hiệu suất
  getVolume: { args: [sinceMs: number, groupBy: GroupBy, untilMs?: number]; result: VolumePoint[] };
  getHeatmap: { args: [sinceMs: number]; result: HeatmapCell[] };
  getTopCustomers: { args: [sinceMs: number, limit: number]; result: CustomerRow[] };
  getCustomerSummary: { args: [sinceMs: number]; result: CustomerSummary };
  getResponseLatency: { args: [sinceMs: number]; result: LatencyStats };
  getRecentMessages: { args: [limit: number, threadId?: string]; result: RecentMessage[] };

  // 3. Hội thoại
  getConversations: { args: [options: ConversationQuery]; result: ConversationListItem[] };
  getConversationMessages: {
    args: [conversationId: string];
    result: ConversationMessage[];
  };
  getConversationProcessing: {
    args: [conversationId: string];
    result: MessageProcessing[];
  };
  getConversationAttention: { args: [conversationId: string]; result: AttentionItem[] };

  // 4. Khách hàng
  getCustomersWithInterest: { args: [options: CustomerQuery]; result: CustomerListRow[] };
  getAllCustomers: { args: [limit: number]; result: CustomerListItem[] };
  getTotalCustomersLifetime: { args: []; result: number };
  getCustomerActivityStats: {
    args: [sinceMs: number, untilMs: number];
    result: CustomerActivityStats;
  };
  getCustomerActivityTrend: {
    args: [sinceMs: number, untilMs: number];
    result: CustomerActivityPoint[];
  };
  getConversationVolumeTrend: {
    args: [sinceMs: number, untilMs: number];
    result: ConversationVolumePoint[];
  };
  getInterestSignalsTrend: {
    args: [sinceMs: number, untilMs: number];
    result: InterestSignalPoint[];
  };
  getOpenAttentionItems: { args: [limit: number]; result: AttentionItem[] };
  getCustomerDetail: { args: [customerId: string]; result: CustomerDetail | null };
  getCustomerConversations: {
    args: [customerId: string, limit: number];
    result: ConversationListItem[];
  };
  getCustomerInterests: { args: [customerId: string]; result: CustomerInterest[] };
  getCustomerPurchaseSignal: {
    args: [customerId: string];
    result: CustomerPurchaseSignal;
  };
  getCustomerOpenAttention: { args: [customerId: string]; result: AttentionItem[] };
  getCustomerNotes: { args: [customerId: string]; result: CustomerNote[] };
  insertCustomerNote: {
    args: [customerId: string, authorEmail: string, authorName: string | null, text: string];
    result: null;
  };

  // 5. Sản phẩm
  getTopProducts: { args: [sinceMs: number, limit: number]; result: TopProductRow[] };
  getProductQuestionBreakdown: {
    args: [sinceMs: number, productId?: string];
    result: QuestionTypeCount[];
  };
  getProductMentionSummary: { args: [sinceMs: number]; result: ProductMentionSummary };
  getUnknownProductMentions: {
    args: [sinceMs: number, limit: number];
    result: UnknownProductMention[];
  };
}

export type RpcFn = keyof RpcMap;
export type RpcArgs<F extends RpcFn> = RpcMap[F]["args"];
export type RpcResult<F extends RpcFn> = RpcMap[F]["result"];

/**
 * true khi mọi dữ liệu đang là dữ liệu mẫu (không có DATA_API_TOKEN).
 * Dùng để UI gắn cờ "Dữ liệu mẫu" — không bao giờ để người dùng tưởng là số thật.
 */
export function isMockMode(): boolean {
  return !hasRealToken();
}

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/** data-api §9: timeout của client. */
const RPC_TIMEOUT_MS = 15_000;
/** data-api §9: body request tối đa 64 KB. */
const MAX_BODY_BYTES = 64 * 1024;
/** data-api §9: "Luôn truyền limit hợp lý (20–200)" — chặn limit quét quá lớn. */
const MAX_LIMIT = 200;
const MIN_LIMIT = 1;
const MAX_SEARCH_LEN = 120;
/** data-api §9: UI tự giới hạn nội dung ghi chú. */
const MAX_NOTE_LEN = 2_000;

const CONVERSATION_STATUSES: readonly ConversationStatus[] = ["attention", "active", "answered"];
const INTEREST_STATUSES: readonly InterestStatus[] = [
  "purchase_intent",
  "considering",
  "new",
  "inactive",
  "unknown",
];

function hasRealToken(): boolean {
  return Boolean(process.env.DATA_API_TOKEN?.trim());
}

/**
 * Kiểm tra tham số của TỪNG hàm (data-api §3: "Server không kiểm tra kiểu
 * tham số — hãy validate ở phía UI").
 *
 * Ký hiệu: hậu tố `?` = tham số tùy chọn ở cuối (server đổi `null` -> `undefined`).
 * Khối `Record` bắt buộc đủ mọi khóa của `RpcFn`, nên thiếu hàm là lỗi type-check.
 */
const ARG_SPECS: Record<RpcFn, readonly string[]> = {
  // Tổng quan & hệ thống
  getPeriodStats: ["ms", "ms"],
  getDailyPerformanceTrend: ["ms", "ms"],
  getAiInsightCounts: ["ms", "ms"],
  getCustomersPerBucket: ["ms", "groupBy", "ms?"],
  getAttentionItems: ["limit"],
  getRecentConversations: ["limit"],
  getOpenAttentionCount: [],
  getSystemStatus: [],
  // Lưu lượng & hiệu suất
  getVolume: ["ms", "groupBy", "ms?"],
  getHeatmap: ["ms"],
  getTopCustomers: ["ms", "limit"],
  getCustomerSummary: ["ms"],
  getResponseLatency: ["ms"],
  getRecentMessages: ["limit", "id?"],
  // Hội thoại
  getConversations: ["conversationQuery"],
  getConversationMessages: ["id"],
  getConversationProcessing: ["id"],
  getConversationAttention: ["id"],
  // Khách hàng
  getCustomersWithInterest: ["customerQuery"],
  getAllCustomers: ["limit"],
  getTotalCustomersLifetime: [],
  getCustomerActivityStats: ["ms", "ms"],
  getCustomerActivityTrend: ["ms", "ms"],
  getConversationVolumeTrend: ["ms", "ms"],
  getInterestSignalsTrend: ["ms", "ms"],
  getOpenAttentionItems: ["limit"],
  getCustomerDetail: ["id"],
  getCustomerConversations: ["id", "limit"],
  getCustomerInterests: ["id"],
  getCustomerPurchaseSignal: ["id"],
  getCustomerOpenAttention: ["id"],
  getCustomerNotes: ["id"],
  insertCustomerNote: ["id", "email", "nullableString", "text"],
  // Sản phẩm
  getTopProducts: ["ms", "limit"],
  getProductQuestionBreakdown: ["ms", "id?"],
  getProductMentionSummary: ["ms"],
  getUnknownProductMentions: ["ms", "limit"],
};

function badRequest(fn: string, message: string): DataApiError {
  return new DataApiError({ kind: "bad-request", fn, body: message });
}

/** Trích thông điệp gốc của lỗi mạng (fetch -> TypeError: fetch failed -> ECONNREFUSED...). */
function networkDetail(cause: unknown): string {
  const parts: string[] = [];
  let current: unknown = cause;
  for (let i = 0; i < 4 && current; i++) {
    const message = (current as Error | undefined)?.message;
    if (message && !parts.includes(message)) parts.push(message);
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(" -> ");
}

function normalizeLimit(fn: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw badRequest(fn, `limit phải là số, nhận được ${JSON.stringify(value)}`);
  }
  const n = Math.round(value);
  if (n < MIN_LIMIT) throw badRequest(fn, `limit phải >= ${MIN_LIMIT}`);
  if (n > MAX_LIMIT) {
    // data-api §9: limit lớn làm chậm hàm quét theo từng thread.
    console.warn(`[senzu-api] ${fn}: limit ${n} > ${MAX_LIMIT} -> chặn về ${MAX_LIMIT}.`);
    return MAX_LIMIT;
  }
  return n;
}

function normalizeEpochMs(fn: string, label: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw badRequest(fn, `${label} phải là epoch millisecond (number), nhận được ${JSON.stringify(value)}`);
  }
  if (value < 0) throw badRequest(fn, `${label} không được âm`);
  return value;
}

function normalizeId(fn: string, label: string, value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest(fn, `${label} phải là chuỗi không rỗng`);
  }
  return value;
}

function normalizeEnum<T extends string>(
  fn: string,
  label: string,
  value: unknown,
  allowed: readonly T[]
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw badRequest(
      fn,
      `${label} không hợp lệ (${JSON.stringify(value)}); chỉ chấp nhận: ${allowed.join(", ")}`
    );
  }
  return value as T;
}

function normalizeQuery<T extends { limit: number; search?: string; status?: string }>(
  fn: string,
  value: unknown,
  statuses: readonly string[],
  build: (input: { limit: number; search?: string; status?: string }) => T
): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw badRequest(fn, "options phải là object { search?, status?, limit }");
  }
  const raw = value as Record<string, unknown>;
  const input: { limit: number; search?: string; status?: string } = {
    limit: normalizeLimit(fn, raw.limit ?? 50),
  };
  if (raw.search !== undefined && raw.search !== null && raw.search !== "") {
    if (typeof raw.search !== "string") throw badRequest(fn, "options.search phải là chuỗi");
    const search = raw.search.trim().slice(0, MAX_SEARCH_LEN);
    if (search) input.search = search;
  }
  if (raw.status !== undefined && raw.status !== null && raw.status !== "") {
    input.status = normalizeEnum(fn, "options.status", raw.status, statuses);
  }
  return build(input);
}

/** Trả về mảng tham số đã chuẩn hoá; ném `DataApiError` (bad-request) nếu sai. */
function normalizeArgs(fn: RpcFn, args: readonly unknown[]): unknown[] {
  const spec = ARG_SPECS[fn];
  if (!spec) return [...args];
  if (args.length > spec.length) {
    throw badRequest(fn, `thừa ${args.length - spec.length} tham số (chỉ nhận tối đa ${spec.length})`);
  }

  const out: unknown[] = [];
  for (let i = 0; i < args.length; i++) {
    const token = spec[i];
    const optional = token.endsWith("?");
    const kind = optional ? token.slice(0, -1) : token;
    const value = args[i];

    if (value === undefined || value === null) {
      if (kind === "nullableString" || optional) {
        out.push(value);
        continue;
      }
      throw badRequest(fn, `tham số #${i + 1} (${kind}) là bắt buộc`);
    }

    switch (kind) {
      case "ms":
        out.push(normalizeEpochMs(fn, `tham số #${i + 1}`, value));
        break;
      case "limit":
        out.push(normalizeLimit(fn, value));
        break;
      case "groupBy":
        out.push(normalizeEnum(fn, `tham số #${i + 1}`, value, ["day", "hour"] as const));
        break;
      case "id":
        out.push(normalizeId(fn, `tham số #${i + 1}`, value));
        break;
      case "email": {
        const email = normalizeId(fn, "authorEmail", value);
        if (!email.includes("@")) throw badRequest(fn, "authorEmail phải là địa chỉ email hợp lệ");
        out.push(email);
        break;
      }
      case "nullableString":
        if (typeof value !== "string") throw badRequest(fn, `tham số #${i + 1} phải là chuỗi hoặc null`);
        out.push(value);
        break;
      case "text": {
        if (typeof value !== "string") throw badRequest(fn, "text phải là chuỗi");
        const text = value.trim();
        if (!text) throw badRequest(fn, "text không được rỗng");
        if (text.length > MAX_NOTE_LEN) {
          throw badRequest(fn, `text dài ${text.length} ký tự, tối đa ${MAX_NOTE_LEN}`);
        }
        out.push(text);
        break;
      }
      case "conversationQuery":
        out.push(
          normalizeQuery<ConversationQuery>(fn, value, CONVERSATION_STATUSES, (input) => ({
            ...(input.search ? { search: input.search } : {}),
            ...(input.status ? { status: input.status as ConversationStatus } : {}),
            limit: input.limit,
          }))
        );
        break;
      case "customerQuery":
        out.push(
          normalizeQuery<CustomerQuery>(fn, value, INTEREST_STATUSES, (input) => ({
            ...(input.search ? { search: input.search } : {}),
            ...(input.status ? { status: input.status as InterestStatus } : {}),
            limit: input.limit,
          }))
        );
        break;
      default:
        throw badRequest(fn, `không biết cách kiểm tra tham số loại "${kind}"`);
    }
  }
  return out;
}

function classifyHttpError(fn: string, status: number, body: string): DataApiError {
  const kind: DataApiErrorKind =
    status === 400
      ? "bad-request"
      : status === 401 || status === 403
        ? "unauthorized"
        : status === 404
          ? "not-found"
          : status >= 500
            ? "upstream"
            : "unknown";
  return new DataApiError({ kind, fn, status, body });
}

/** Lấy `error` từ body JSON của Data API (nếu có) để báo lỗi đúng nguyên nhân. */
function extractErrorBody(text: string): string {
  if (!text) return "";
  try {
    const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
    const detail =
      typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.message === "string"
          ? parsed.message
          : null;
    if (detail) return `${detail} — ${text.slice(0, 200)}`;
  } catch {
    // body không phải JSON -> dùng nguyên văn (đã cắt bớt ở DataApiError)
  }
  return text;
}

/**
 * Gọi một hàm của Senzu Data API (data-api §3).
 *
 * Kiểu dữ liệu: tên hàm và tham số được kiểm tra bằng `RpcMap`, kết quả suy ra
 * tự động — không còn `rpc<SomeType>("tên-hàm-chuỗi")` được.
 *
 * Xử lý lỗi: mọi thất bại đều ném `DataApiError` có `kind` để UI phân biệt
 * "thiếu cấu hình" / "token sai" / "hàm không tồn tại" / "server lỗi" / "mạng".
 *
 * Quy tắc (data-api §9):
 * - Có token -> PHẢI gọi thật; lỗi HTTP/mạng -> ném lỗi (không rơi về mock).
 * - Không token -> chỉ mock ở development / lúc build;
 *   ở production runtime phải ném lỗi cấu hình thay vì trả dữ liệu giả.
 */
export async function rpc<F extends RpcFn>(fn: F, ...args: RpcArgs<F>): Promise<RpcResult<F>> {
  const validated = normalizeArgs(fn, args);

  const url = process.env.DATA_API_URL || "https://api-bot.senzu-base.vn";
  const token = process.env.DATA_API_TOKEN?.trim();

  if (!token) {
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      throw new DataApiError({
        kind: "config",
        fn,
        body: "DATA_API_TOKEN trống",
        message: `Cấu hình thiếu DATA_API_TOKEN: không thể gọi ${fn} và không được dùng dữ liệu mẫu ở production.`,
      });
    }
    console.warn(`[senzu-api] DATA_API_TOKEN trống -> dùng dữ liệu MẪU cho ${fn}.`);
    return getMockData<RpcResult<F>>(fn, validated);
  }

  const body = JSON.stringify({ fn, args: validated });
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    throw badRequest(fn, `body dài hơn ${MAX_BODY_BYTES / 1024} KB`);
  }

  let res: Response;
  try {
    res = await fetch(`${url}/rpc`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
  } catch (cause) {
    const name = (cause as Error | undefined)?.name;
    const timedOut = name === "TimeoutError" || name === "AbortError";
    const error = new DataApiError({
      kind: timedOut ? "timeout" : "network",
      fn,
      body: timedOut ? `quá ${RPC_TIMEOUT_MS}ms` : networkDetail(cause),
      cause,
    });
    console.error(error.toLogString(), timedOut ? "" : cause);
    throw error;
  }

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    const error = classifyHttpError(fn, res.status, extractErrorBody(text));
    console.error(error.toLogString());
    throw error;
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (cause) {
    const error = new DataApiError({ kind: "bad-response", fn, status: res.status, body: text, cause });
    console.error(error.toLogString());
    throw error;
  }

  if (typeof json !== "object" || json === null || !("result" in json)) {
    const error = new DataApiError({
      kind: "bad-response",
      fn,
      status: res.status,
      body: text,
      message: `Data API ${fn}: body 200 thiếu khóa "result"`,
    });
    console.error(error.toLogString());
    throw error;
  }

  return (json as { result: RpcResult<F> }).result;
}

/** Kiểm tra `/health` của Data API (data-api §1) — không cần token. */
export async function getDataApiHealth(
  timeoutMs = 5_000
): Promise<{ ok: boolean; detail: string }> {
  const url = process.env.DATA_API_URL || "https://api-bot.senzu-base.vn";
  try {
    const res = await fetch(`${url}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok && text.includes("true"), detail: text.slice(0, 200) };
  } catch (cause) {
    return { ok: false, detail: String((cause as Error | undefined)?.message ?? cause) };
  }
}

function getMockData<T>(fn: RpcFn, args: readonly unknown[]): T {
  const now = Date.now();
  const DAY = 86_400_000;

  switch (fn) {
    case "getPeriodStats":
      return {
        incomingCount: 428,
        outgoingCount: 412,
        distinctCustomers: 94,
        avgLatencyMs: 6420,
        repliedRatio: 0.962,
      } as unknown as T;

    case "getDailyPerformanceTrend":
      return Array.from({ length: 7 }, (_, i) => ({
        date: new Date(now - (6 - i) * DAY).toISOString().slice(0, 10),
        repliedRatio: 0.92 + Math.random() * 0.07,
        avgLatencyMs: 5000 + Math.floor(Math.random() * 3000),
      })) as unknown as T;

    case "getAiInsightCounts":
      return { humanRequestCount: 14, productGapCount: 6 } as unknown as T;

    case "getCustomersPerBucket":
    case "getVolume": {
      // Tôn trọng since/until/groupBy (data-api §6) để bộ lọc ngày có ý nghĩa.
      const VN = 7 * 3_600_000;
      const sinceMs = typeof args[0] === "number" ? args[0] : now - 7 * DAY;
      const groupBy: GroupBy = args[1] === "hour" ? "hour" : "day";
      const untilMs = typeof args[2] === "number" ? args[2] : now;
      const step = groupBy === "hour" ? 3_600_000 : DAY;
      const start =
        Math.floor((sinceMs + VN) / step) * step - VN;
      const points: Array<{ bucket: string; incoming: number; outgoing: number }> = [];
      for (let ms = start; ms < untilMs && points.length < 400; ms += step) {
        const vnDate = new Date(ms + VN);
        const pad = (n: number) => String(n).padStart(2, "0");
        const bucket =
          groupBy === "hour"
            ? `${vnDate.getUTCFullYear()}-${pad(vnDate.getUTCMonth() + 1)}-${pad(vnDate.getUTCDate())}T${pad(vnDate.getUTCHours())}`
            : vnDate.toISOString().slice(0, 10);
        points.push({
          bucket,
          incoming: Math.floor(4 + Math.random() * (groupBy === "hour" ? 8 : 60)),
          outgoing: Math.floor(4 + Math.random() * (groupBy === "hour" ? 8 : 58)),
        });
      }
      return points as unknown as T;
    }

    case "getAttentionItems":
    case "getOpenAttentionItems":
    case "getCustomerOpenAttention":
    case "getConversationAttention":
      return [
        {
          id: 101,
          type: "HUMAN_REQUEST_SIGNAL",
          severity: "warning",
          source: "messenger_bot",
          conversationId: "thread_1001",
          customerId: "cus_fb_901",
          customerName: "Nguyễn Văn An",
          messagePreview: "Cho mình gặp tư vấn viên trực tiếp với!",
          detail: "Khách hàng yêu cầu hỗ trợ từ nhân viên con người",
          metadata: { confidence: 0.95 },
          createdAtMs: now - 3600_000,
        },
        {
          id: 102,
          type: "UNKNOWN_PRODUCT",
          severity: "warning",
          source: "ai_pipeline",
          conversationId: "thread_1002",
          customerId: "cus_fb_902",
          customerName: "Trần Thị Mai",
          messagePreview: "Bên bạn có mẫu Áo Sơ Mi Senzu Premium 2026 không?",
          detail: "Sản phẩm không có trong catalog tri thức",
          metadata: { mentioned_name: "Áo Sơ Mi Senzu Premium 2026" },
          createdAtMs: now - 7200_000,
        },
        {
          id: 103,
          type: "KNOWLEDGE_GAP",
          severity: "info",
          source: "ai_pipeline",
          conversationId: "thread_1003",
          customerId: "cus_fb_903",
          customerName: "Lê Hoàng Nam",
          messagePreview: "Chính sách bảo hành đổi trả trong bao nhiêu ngày?",
          detail: "AI độ tin cậy thấp (< 70%)",
          metadata: { confidence: 0.62 },
          createdAtMs: now - 14400_000,
        }
      ] as unknown as T;

    case "getRecentConversations":
      return [
        { threadId: "thread_1001", customerName: "Nguyễn Văn An", lastMessageText: "Cho mình gặp tư vấn viên trực tiếp với!", lastMessageAtMs: now - 1200_000, status: "needs_attention", responseTimeMs: null },
        { threadId: "thread_1002", customerName: "Trần Thị Mai", lastMessageText: "Dạ vâng mình cám ơn bot nhiều nha", lastMessageAtMs: now - 3600_000, status: "answered", responseTimeMs: 4200 },
        { threadId: "thread_1003", customerName: "Lê Hoàng Nam", lastMessageText: "Mẫu này còn size L không shop?", lastMessageAtMs: now - 7200_000, status: "needs_attention", responseTimeMs: null },
        { threadId: "thread_1004", customerName: "Phạm Thu Thảo", lastMessageText: "Shop ship về Hà Nội mất bao lâu?", lastMessageAtMs: now - 10800_000, status: "answered", responseTimeMs: 3800 },
      ] as unknown as T;

    case "getOpenAttentionCount":
      return 3 as unknown as T;

    case "getSystemStatus":
      return {
        chromeRunning: true,
        messengerConnected: true,
        aiProvider: "Google Gemini 1.5 Pro",
        aiModel: "gemini-1.5-pro",
        knowledgeLoadedAtMs: now - 3600_000 * 5,
        catalogSyncedAtMs: now - 3600_000 * 2,
        catalogCount: 148,
        lastTickAtMs: now - 12_000,
        lastReplyAtMs: now - 45_000,
        updatedAtMs: now - 10_000,
        isStale: false,
      } as unknown as T;

    case "getConversations": {
      // Tôn trọng options { search, status, limit } để UI test được đúng (data-api §6).
      const opts = (args[0] ?? {}) as { search?: string; status?: string; limit?: number };
      const q = (opts.search || "").toLowerCase();
      const rows = [
        { conversationId: "thread_1001", customerId: "cus_fb_901", customerName: "Nguyễn Văn An", lastMessageText: "Cho mình gặp tư vấn viên trực tiếp với!", lastMessageAtMs: now - 1200_000, messageCount: 12, status: "attention" },
        { conversationId: "thread_1002", customerId: "cus_fb_902", customerName: "Trần Thị Mai", lastMessageText: "Dạ vâng mình cám ơn bot nhiều nha", lastMessageAtMs: now - 3600_000, messageCount: 8, status: "answered" },
        { conversationId: "thread_1003", customerId: "cus_fb_903", customerName: "Lê Hoàng Nam", lastMessageText: "Mẫu này còn size L không shop?", lastMessageAtMs: now - 7200_000, messageCount: 5, status: "active" },
        { conversationId: "thread_1004", customerId: "cus_fb_904", customerName: "Phạm Thu Thảo", lastMessageText: "Shop ship về Hà Nội mất bao lâu?", lastMessageAtMs: now - 10800_000, messageCount: 14, status: "answered" },
        { conversationId: "thread_1005", customerId: "cus_fb_905", customerName: "Đặng Hoàng Việt", lastMessageText: "Cho mình đặt 2 cái màu xanh lá", lastMessageAtMs: now - 14400_000, messageCount: 9, status: "answered" },
      ] as Array<Record<string, unknown>>;
      const filtered = rows
        .filter((r) => (opts.status ? r.status === opts.status : true))
        .filter((r) =>
          q
            ? String(r.customerName).toLowerCase().includes(q) ||
              String(r.customerId).toLowerCase().includes(q) ||
              String(r.lastMessageText).toLowerCase().includes(q)
            : true
        )
        .sort((a, b) => Number(b.lastMessageAtMs) - Number(a.lastMessageAtMs))
        .slice(0, opts.limit ?? 50);
      return filtered as unknown as T;
    }

    case "getTopCustomers":
      return [
        { senderId: "cus_fb_904", senderName: "Phạm Thu Thảo", msgCount: 46, lastTs: now - 10800_000, isNew: false },
        { senderId: "cus_fb_901", senderName: "Nguyễn Văn An", msgCount: 38, lastTs: now - 1200_000, isNew: false },
        { senderId: "cus_fb_905", senderName: "Đặng Hoàng Việt", msgCount: 27, lastTs: now - 14400_000, isNew: false },
        { senderId: "cus_fb_906", senderName: "Hoàng Thị Lan", msgCount: 19, lastTs: now - 7200_000, isNew: true },
        { senderId: "cus_fb_903", senderName: "Lê Hoàng Nam", msgCount: 12, lastTs: now - 7200_000, isNew: false },
      ] as unknown as T;

    case "getHeatmap":
      // Chỉ trả ô có dữ liệu (data-api §5) — mô phỏng giờ cao điểm 9–11 và 20–22.
      return Array.from({ length: 30 }, (_, i) => {
        // weekday theo data-api §5: 0=CN … 6=T7 (mock trước đây sinh 1..7 -> sai).
        const weekday = i % 7;
        const hour = i % 2 === 0 ? 9 + (i % 3) : 20 + (i % 3);
        return { weekday, hour, count: 4 + ((i * 7) % 23) };
      }) as unknown as T;

    case "getRecentMessages":
      return [
        { id: "msg_r1", threadId: "thread_1001", senderId: "cus_fb_901", senderName: "Nguyễn Văn An", text: "Cho mình gặp tư vấn viên trực tiếp với!", direction: "incoming", timestampMs: now - 1200_000 },
        { id: "msg_r2", threadId: "thread_1003", senderId: "cus_fb_903", senderName: "Lê Hoàng Nam", text: "Mẫu này còn size L không shop?", direction: "incoming", timestampMs: now - 7200_000 },
        { id: "msg_r3", threadId: "thread_1002", senderId: "bot", senderName: "Senzu Bot", text: "Dạ shop cảm ơn chị đã ủng hộ ạ.", direction: "outgoing", timestampMs: now - 3600_000 },
      ] as unknown as T;

    case "getCustomerConversations": {
      const cid = String(args[0] ?? "");
      return [
        { conversationId: "thread_1001", customerId: cid, customerName: "Nguyễn Văn An", lastMessageText: "Cho mình gặp tư vấn viên trực tiếp với!", lastMessageAtMs: now - 1200_000, messageCount: 12, status: "attention" },
        { conversationId: "thread_1007", customerId: cid, customerName: "Nguyễn Văn An", lastMessageText: "Serum này dùng bao lâu thì thấy hiệu quả ạ?", lastMessageAtMs: now - 259_200_000, messageCount: 6, status: "answered" },
      ] as unknown as T;
    }

    case "getConversationMessages":
      return [
        { id: "msg_1", senderId: "cus_fb_901", senderName: "Nguyễn Văn An", text: "Xin chào shop, shop có sản phẩm Senzu Green Tea Serum không?", direction: "incoming", timestampMs: now - 1800_000, frameTsMs: now - 1799_000 },
        { id: "msg_2", senderId: "bot", senderName: "Senzu Bot", text: "Chào bạn An! Dạ bên mình có Senzu Green Tea Serum chai 50ml giá 350.000đ đang có sẵn hàng ạ.", direction: "outgoing", timestampMs: now - 1795_000, frameTsMs: now - 1795_000 },
        { id: "msg_3", senderId: "cus_fb_901", senderName: "Nguyễn Văn An", text: "Cho mình gặp tư vấn viên trực tiếp với!", direction: "incoming", timestampMs: now - 1200_000, frameTsMs: now - 1199_000 },
      ] as unknown as T;

    case "getConversationProcessing":
      return [
        {
          incomingMessageId: "msg_1",
          receivedAtMs: now - 1800_000,
          aiStartedAtMs: now - 1799_000,
          aiCompletedAtMs: now - 1796_000,
          sentAtMs: now - 1795_000,
          aiProvider: "Google Gemini",
          aiModel: "gemini-1.5-pro",
          knowledgePath: "catalog/skincare.md",
          hasCatalog: true,
          status: "success",
          errorDetail: null,
        }
      ] as unknown as T;

    case "getCustomersWithInterest":
      return [
        { customerId: "cus_fb_901", customerName: "Nguyễn Văn An", totalMessages: 12, totalConversations: 2, lastInteractionMs: now - 1200_000, primaryProductName: "Senzu Green Tea Serum", otherProductsCount: 1, interest: { status: "purchase_intent", reasons: ["Có câu hỏi muốn đặt hàng (ORDER)", "Hỏi chi tiết về giá sản phẩm"] } },
        { customerId: "cus_fb_902", customerName: "Trần Thị Mai", totalMessages: 8, totalConversations: 1, lastInteractionMs: now - 3600_000, primaryProductName: "Kem Dưỡng Da Senzu Hydra", otherProductsCount: 2, interest: { status: "considering", reasons: ["Đã hỏi từ 2 sản phẩm trở lên trong 7 ngày"] } },
        { customerId: "cus_fb_903", customerName: "Lê Hoàng Nam", totalMessages: 5, totalConversations: 1, lastInteractionMs: now - 7200_000, primaryProductName: "Áo Sơ Mi Senzu Cotton", otherProductsCount: 0, interest: { status: "new", reasons: ["Đã hỏi 1 sản phẩm lần đầu"] } },
        { customerId: "cus_fb_904", customerName: "Phạm Thu Thảo", totalMessages: 14, totalConversations: 3, lastInteractionMs: now - 10800_000, primaryProductName: "Sữa Rửa Mặt Senzu Gentle", otherProductsCount: 1, interest: { status: "purchase_intent", reasons: ["Khách có 2 lượt tín hiệu đặt hàng"] } },
        { customerId: "cus_fb_905", customerName: "Đặng Hoàng Việt", totalMessages: 9, totalConversations: 1, lastInteractionMs: now - 14400_000, primaryProductName: "Senzu Green Tea Serum", otherProductsCount: 0, interest: { status: "purchase_intent", reasons: ["Đã gửi cú pháp mua hàng"] } },
      ] as unknown as T;

    case "getCustomerDetail": {
      const known: Record<string, { customerName: string; totalMessages: number; totalConversations: number; lastAgo: number }> = {
        cus_fb_901: { customerName: "Nguyễn Văn An", totalMessages: 12, totalConversations: 2, lastAgo: 1200_000 },
        cus_fb_902: { customerName: "Trần Thị Mai", totalMessages: 8, totalConversations: 1, lastAgo: 3600_000 },
        cus_fb_903: { customerName: "Lê Hoàng Nam", totalMessages: 5, totalConversations: 1, lastAgo: 7200_000 },
        cus_fb_904: { customerName: "Phạm Thu Thảo", totalMessages: 14, totalConversations: 3, lastAgo: 10800_000 },
        cus_fb_905: { customerName: "Đặng Hoàng Việt", totalMessages: 9, totalConversations: 1, lastAgo: 14400_000 },
      };
      const id = String(args[0] ?? "");
      const hit = known[id];
      // ID không tồn tại -> null để UI trả 404 thật (khá với dữ liệu thật).
      if (!hit) return null as unknown as T;
      return {
        customerId: id,
        customerName: hit.customerName,
        totalMessages: hit.totalMessages,
        totalConversations: hit.totalConversations,
        firstInteractionMs: now - 30 * DAY,
        lastInteractionMs: now - hit.lastAgo,
      } as unknown as T;
    }

    case "getCustomerInterests":
      return [
        { productId: "prod_01", productName: "Senzu Green Tea Serum", totalMentions: 6, priceCount: 3, orderCount: 2, lastMentionAtMs: now - 1200_000 },
        { productId: "prod_02", productName: "Kem Dưỡng Da Senzu Hydra", totalMentions: 2, priceCount: 1, orderCount: 0, lastMentionAtMs: now - 86400_000 },
      ] as unknown as T;

    case "getCustomerPurchaseSignal":
      return { totalProductQuestions: 8, orderMentions: 3 } as unknown as T;

    case "getCustomerNotes":
      return [
        { id: 1, authorEmail: "phan_nam_thanh@senzu.co.jp", authorName: "Nam Thanh", text: "Khách ưu tiên giao giờ hành chính, gọi điện trước khi giao 15p.", createdAtMs: now - 86400_000 },
        { id: 2, authorEmail: "nhan_vien@senzu.co.jp", authorName: "Nhân Viên Hỗ Trợ", text: "Khách đã chốt chuyển khoản VCB.", createdAtMs: now - 43200_000 },
      ] as unknown as T;

    case "getTopProducts":
      return [
        { productId: "prod_01", productName: "Senzu Green Tea Serum 50ml", mentionCount: 142, uniqueCustomers: 68 },
        { productId: "prod_02", productName: "Kem Dưỡng Da Senzu Hydra Glow", mentionCount: 98, uniqueCustomers: 45 },
        { productId: "prod_03", productName: "Sữa Rửa Mặt Senzu Gentle Clean", mentionCount: 76, uniqueCustomers: 39 },
        { productId: "prod_04", productName: "Kem Chống Nắng Senzu SunShield SPF50+", mentionCount: 54, uniqueCustomers: 28 },
        { productId: "prod_05", productName: "Tẩy Trang Senzu Deep Micellar", mentionCount: 32, uniqueCustomers: 19 },
      ] as unknown as T;

    case "getProductQuestionBreakdown":
      return [
        { questionType: "PRICE", count: 184, uniqueCustomers: 82 },
        { questionType: "FEATURE", count: 112, uniqueCustomers: 56 },
        { questionType: "ORDER", count: 78, uniqueCustomers: 41 },
        { questionType: "AVAILABILITY", count: 45, uniqueCustomers: 26 },
        { questionType: "GENERAL", count: 32, uniqueCustomers: 18 },
        { questionType: "OTHER", count: 15, uniqueCustomers: 9 },
      ] as unknown as T;

    case "getProductMentionSummary":
      return { total: 466, resolved: 432, unresolved: 34, unresolvedRate: 0.073 } as unknown as T;

    case "getUnknownProductMentions":
      return [
        { normalizedName: "Áo sơ mi senzu premium 2026", count: 12, example: "Shop có áo sơ mi senzu premium 2026 không ạ?" },
        { normalizedName: "Kem trị thâm mắt senzu eyecream", count: 8, example: "Tư vấn cho mình kem trị thâm mắt senzu eyecream với" },
        { normalizedName: "Bộ quà tặng tết senzu giftbox", count: 5, example: "Cho mình hỏi bộ quà tặng tết senzu giftbox bao nhiêu" },
      ] as unknown as T;

    case "getTotalCustomersLifetime":
      return 1248 as unknown as T;

    case "getCustomerActivityStats":
      return { customersWithProductInterest: 84, customersWithPurchaseSignal: 38 } as unknown as T;

    case "getResponseLatency":
      return { matchedCount: 380, incomingCount: 428, avgMs: 6420, medianMs: 4100, p90Ms: 14200 } as unknown as T;

    case "getCustomerSummary":
      return { totalCustomers: 94, newCustomers: 32, returningCustomers: 62 } as unknown as T;

    case "insertCustomerNote":
      return null as unknown as T;

    case "getAllCustomers":
      return [
        { customerId: "cus_fb_901", customerName: "Nguyễn Văn An", totalMessages: 12, totalConversations: 2, lastInteractionMs: now - 1200_000 },
        { customerId: "cus_fb_902", customerName: "Trần Thị Mai", totalMessages: 8, totalConversations: 1, lastInteractionMs: now - 3600_000 },
        { customerId: "cus_fb_903", customerName: "Lê Hoàng Nam", totalMessages: 5, totalConversations: 1, lastInteractionMs: now - 7200_000 },
      ] as unknown as T;

    case "getCustomerActivityTrend":
      return Array.from({ length: 7 }, (_, i) => ({
        date: new Date(now - (6 - i) * DAY).toISOString().slice(0, 10),
        activeCustomers: 18 + Math.floor(Math.random() * 14),
        newCustomers: 3 + Math.floor(Math.random() * 6),
        returningCustomers: 12 + Math.floor(Math.random() * 10),
      })) as unknown as T;

    case "getConversationVolumeTrend":
      return Array.from({ length: 7 }, (_, i) => ({
        date: new Date(now - (6 - i) * DAY).toISOString().slice(0, 10),
        customerMessages: 40 + Math.floor(Math.random() * 50),
        aiReplies: 36 + Math.floor(Math.random() * 48),
        otherOutgoing: Math.floor(Math.random() * 6),
      })) as unknown as T;

    case "getInterestSignalsTrend":
      return Array.from({ length: 7 }, (_, i) => ({
        date: new Date(now - (6 - i) * DAY).toISOString().slice(0, 10),
        productMentions: 12 + Math.floor(Math.random() * 18),
        priceQuestions: 5 + Math.floor(Math.random() * 10),
        informationQuestions: 4 + Math.floor(Math.random() * 8),
        orderSignals: 1 + Math.floor(Math.random() * 5),
      })) as unknown as T;

    default:
      // Không bao giờ trả [] im lặng: hàm chưa có mock sẽ làm UI hiểu nhầm là "rỗng".
      console.warn(
        `[senzu-api] Chưa có mock cho "${fn}" — trả về null. Bổ sung vào getMockData().`
      );
      return null as unknown as T;
  }
}
