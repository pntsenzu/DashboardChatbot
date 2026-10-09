import "server-only";
import { DataApiError, type DataApiErrorKind } from "@/lib/api-error";
import { isDemoSession } from "@/lib/demo";
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

  // Chế độ DEMO ("Xem thử với dữ liệu mẫu"): luôn trả dữ liệu mẫu — kể cả khi
  // đã cấu hình token thật và kể cả ở production. Người xem demo không bao giờ
  // chạm tới Data API thật -> không lộ dữ liệu khách hàng.
  if (await isDemoSession()) {
    return getMockData<RpcResult<F>>(fn, validated);
  }

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

/* ------------------------------------------------------------------ *
 * DỮ LIỆU MẪU                                                        *
 *                                                                     *
 * Bộ dữ liệu hard-code dùng cho:                                     *
 * - development khi thiếu DATA_API_TOKEN (xem trước giao diện);      *
 * - chế độ DEMO "Xem thử với dữ liệu mẫu" — chạy được cả production. *
 *                                                                     *
 * Số liệu sinh theo khóa CỐ ĐỊNH (không dùng Math.random) để trang  *
 * không nhảy số mỗi lần tải, và bám theo kỳ đang chọn để biểu đồ     *
 * luôn đủ số ngày trong kỳ.                                          *
 * ------------------------------------------------------------------ */

/** Số [0, 1) cố định theo khóa — cùng khóa thì cùng số giữa mọi lần render. */
function sample01(...parts: Array<string | number>): number {
  const key = parts.join("|");
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

/** Số nguyên cố định trong [min, max] theo khóa. */
function sampleInt(min: number, max: number, ...parts: Array<string | number>): number {
  return min + Math.floor(sample01(...parts) * (max - min + 1));
}

const DEMO_VN = 7 * 3_600_000;
const DEMO_DAY = 86_400_000;

/** `ms` -> `YYYY-MM-DD` theo giờ VN (data-api §5 — bucket theo giờ VN). */
function demoISO(ms: number): string {
  const d = new Date(ms + DEMO_VN);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Mọi ngày (giờ VN) trong `[sinceMs, untilMs)` — biểu đồ không được trống ngày. */
function demoDays(sinceMs: number, untilMs: number, cap = 400): string[] {
  const start = Math.floor((sinceMs + DEMO_VN) / DEMO_DAY) * DEMO_DAY - DEMO_VN;
  const days: string[] = [];
  for (let ms = start; ms < untilMs && days.length < cap; ms += DEMO_DAY) {
    days.push(demoISO(ms));
  }
  return days;
}

/** Kỳ `[since, until]` từ tham số hàm — thiếu/mù thì mặc định 7 ngày gần nhất. */
function demoRange(args: readonly unknown[], index = 0): [number, number] {
  const now = Date.now();
  const sinceMs = Number(args[index]);
  const untilMs = Number(args[index + 1]);
  return [
    Number.isFinite(sinceMs) ? sinceMs : now - 7 * DEMO_DAY,
    Number.isFinite(untilMs) ? untilMs : now,
  ];
}

/** Danh bạ khách hàng mẫu — dùng chung cho mọi hàm để các trang tương khớp. */
const DEMO_CUSTOMERS = [
  { id: "cus_demo_01", name: "Nguyễn Văn An", product: "Senzu Green Tea Serum 50ml", interest: "purchase_intent", msgs: 38 },
  { id: "cus_demo_02", name: "Trần Thị Mai", product: "Kem Dưỡng Da Senzu Hydra Glow", interest: "considering", msgs: 27 },
  { id: "cus_demo_03", name: "Lê Hoàng Nam", product: "Áo Sơ Mi Senzu Cotton", interest: "new", msgs: 12 },
  { id: "cus_demo_04", name: "Phạm Thu Thảo", product: "Sữa Rửa Mặt Senzu Gentle Clean", interest: "purchase_intent", msgs: 46 },
  { id: "cus_demo_05", name: "Đặng Hoàng Việt", product: "Senzu Green Tea Serum 50ml", interest: "purchase_intent", msgs: 19 },
  { id: "cus_demo_06", name: "Hoàng Thị Lan", product: "Kem Chống Nắng Senzu SunShield SPF50+", interest: "considering", msgs: 15 },
  { id: "cus_demo_07", name: "Võ Minh Tuấn", product: "Tẩy Trang Senzu Deep Micellar", interest: "inactive", msgs: 8 },
  { id: "cus_demo_08", name: "Bùi Ngọc Hân", product: "Kem Dưỡng Da Senzu Hydra Glow", interest: "new", msgs: 6 },
  { id: "cus_demo_09", name: "Đỗ Gia Bảo", product: "Senzu Green Tea Serum 50ml", interest: "considering", msgs: 11 },
  { id: "cus_demo_10", name: "Lý Thanh Vy", product: "Sữa Rửa Mặt Senzu Gentle Clean", interest: "purchase_intent", msgs: 23 },
  { id: "cus_demo_11", name: "Ngô Hữu Phước", product: "Kem Chống Nắng Senzu SunShield SPF50+", interest: "new", msgs: 5 },
  { id: "cus_demo_12", name: "Mai Phương Linh", product: "Tẩy Trang Senzu Deep Micellar", interest: "considering", msgs: 17 },
] as ReadonlyArray<{
  id: string;
  name: string;
  product: string;
  interest: InterestStatus;
  msgs: number;
}>;

/** Lý do phân loại quan tâm — cùng giọng văn với dữ liệu thật. */
const DEMO_REASONS: Record<InterestStatus, string[]> = {
  purchase_intent: ["Có câu hỏi về giá và tín hiệu đặt hàng (ORDER)", "Đã hỏi tồn kho trước khi chốt"],
  considering: ["Đã hỏi từ 2 sản phẩm trở lên trong 7 ngày", "Đang so sánh giá giữa các dòng"],
  new: ["Đã hỏi 1 sản phẩm lần đầu", "Mới tương tác trong kỳ"],
  inactive: ["Chưa có tương tác mới trong kỳ"],
  unknown: [],
};

/** ID hội thoại mẫu của một khách (mỗi khách một thread). */
function threadIdOf(customerId: string): string {
  return `thr_${customerId.replace("cus_", "")}`;
}

/** Khách theo id — `null` khi id không tồn tại (trang chi tiết sẽ trả 404 thật). */
function demoCustomerById(id: string) {
  return DEMO_CUSTOMERS.find((c) => c.id === id) ?? null;
}

/** Lượt tương tác cuối trong kỳ — neo về cuối kỳ đã chọn, không vượt ra ngoài. */
function demoLastTs(sinceMs: number, id: string): number {
  const end = Math.min(Date.now(), sinceMs + 30 * DEMO_DAY);
  return end - sampleInt(5, 900, "lastTs", id) * 60_000;
}

/** Script hội thoại mẫu của một khách (tên + sản phẩm của khách đó). */
function demoScript(c: (typeof DEMO_CUSTOMERS)[number]): Array<{
  direction: "incoming" | "outgoing";
  text: string;
}> {
  const price = sampleInt(190, 590, "price", c.id) * 1_000;
  const shortName = c.name.split(" ").at(-1) ?? c.name;
  const script: Array<{ direction: "incoming" | "outgoing"; text: string }> = [
    { direction: "incoming", text: `Chào shop, cho mình hỏi ${c.product} giá bao nhiêu ạ?` },
    {
      direction: "outgoing",
      text: `Chào bạn ${shortName}! Dạ ${c.product} đang giá ${price.toLocaleString("vi-VN")}đ ạ.`,
    },
    { direction: "incoming", text: "Sản phẩm này còn hàng không shop?" },
    { direction: "outgoing", text: "Dạ còn hàng bạn nhé, tồn kho đang được đồng bộ theo thời gian thực ạ." },
  ];
  if (c.interest === "purchase_intent") {
    script.push(
      { direction: "incoming", text: "Cho mình đặt 1 cái nhé, ship về TP.HCM mất bao lâu?" },
      { direction: "outgoing", text: "Dạ bạn xác nhận giúp shop tên và số điện thoại để chốt đơn ạ." }
    );
  } else if (c.interest === "considering") {
    script.push({ direction: "incoming", text: "Để mình suy nghĩ thêm nha shop." });
  }
  return script;
}

/** Sự kiện cần chú ý mẫu — "nóng" trong vài giờ gần đây. */
function demoAttentionItems(): AttentionItem[] {
  const now = Date.now();
  const [a, b, c] = DEMO_CUSTOMERS;
  return [
    {
      id: 101,
      type: "HUMAN_REQUEST_SIGNAL",
      severity: "warning",
      source: "messenger_bot",
      conversationId: threadIdOf(a.id),
      customerId: a.id,
      customerName: a.name,
      messagePreview: "Cho mình gặp tư vấn viên trực tiếp với!",
      detail: "Khách hàng yêu cầu hỗ trợ từ nhân viên con người",
      metadata: { confidence: 0.95 },
      createdAtMs: now - 3_600_000,
    },
    {
      id: 102,
      type: "UNKNOWN_PRODUCT",
      severity: "warning",
      source: "ai_pipeline",
      conversationId: threadIdOf(b.id),
      customerId: b.id,
      customerName: b.name,
      messagePreview: "Bên bạn có mẫu Áo Sơ Mi Senzu Premium 2026 không?",
      detail: "Sản phẩm không có trong catalog tri thức",
      metadata: { mentioned_name: "Áo Sơ Mi Senzu Premium 2026" },
      createdAtMs: now - 7_200_000,
    },
    {
      id: 103,
      type: "KNOWLEDGE_GAP",
      severity: "info",
      source: "ai_pipeline",
      conversationId: threadIdOf(c.id),
      customerId: c.id,
      customerName: c.name,
      messagePreview: "Chính sách bảo hành đổi trả trong bao nhiêu ngày?",
      detail: "AI độ tin cậy thấp (< 70%)",
      metadata: { confidence: 0.62 },
      createdAtMs: now - 14_400_000,
    },
  ];
}

function getMockData<T>(fn: RpcFn, args: readonly unknown[]): T {
  const now = Date.now();
  const DAY = 86_400_000;

  switch (fn) {
    case "getPeriodStats": {
      // Kỳ có ý nghĩa với số liệu mẫu: lượng tin và số khách tăng theo số ngày.
      const [sinceMs, untilMs] = demoRange(args);
      const days = Math.max(1, Math.round((untilMs - sinceMs) / DAY));
      const incoming = days * sampleInt(38, 52, "incoming", days);
      return {
        incomingCount: incoming,
        outgoingCount: Math.round(incoming * 0.95),
        distinctCustomers: Math.min(DEMO_CUSTOMERS.length, 6 + Math.round(days * 0.3)),
        avgLatencyMs: sampleInt(5200, 7400, "latency", days),
        repliedRatio: 0.9 + sample01("ratio", days) * 0.08,
      } as unknown as T;
    }

    case "getDailyPerformanceTrend": {
      const [sinceMs, untilMs] = demoRange(args);
      return demoDays(sinceMs, untilMs).map((date) => ({
        date,
        repliedRatio: 0.9 + sample01("replied", date) * 0.08,
        avgLatencyMs: sampleInt(4500, 8200, "avgLatency", date),
      })) as unknown as T;
    }

    case "getAiInsightCounts":
      return { humanRequestCount: 14, productGapCount: 6 } as unknown as T;

    case "getCustomersPerBucket":
    case "getVolume": {
      // Tôn trọng since/until/groupBy (data-api §6) để bộ lọc ngày có ý nghĩa.
      const sinceMs = typeof args[0] === "number" ? args[0] : now - 7 * DAY;
      const groupBy: GroupBy = args[1] === "hour" ? "hour" : "day";
      const untilMs = typeof args[2] === "number" ? args[2] : now;
      const step = groupBy === "hour" ? 3_600_000 : DAY;
      const start =
        Math.floor((sinceMs + DEMO_VN) / step) * step - DEMO_VN;
      const points: Array<{ bucket: string; incoming: number; outgoing: number }> = [];
      for (let ms = start; ms < untilMs && points.length < 400; ms += step) {
        const bucket =
          groupBy === "hour"
            ? `${demoISO(ms)}T${String(new Date(ms + DEMO_VN).getUTCHours()).padStart(2, "0")}`
            : demoISO(ms);
        points.push({
          bucket,
          incoming: sampleInt(4, groupBy === "hour" ? 12 : 64, "incoming", bucket),
          outgoing: sampleInt(4, groupBy === "hour" ? 12 : 62, "outgoing", bucket),
        });
      }
      return points as unknown as T;
    }

    case "getAttentionItems":
    case "getOpenAttentionItems":
    case "getCustomerOpenAttention":
    case "getConversationAttention": {
      // Cùng một nguồn sự kiện mẫu — lọc theo khách / hội thoại / limit (data-api §6).
      const items = demoAttentionItems();
      if (fn === "getCustomerOpenAttention") {
        const cid = String(args[0] ?? "");
        return items.filter((i) => i.customerId === cid) as unknown as T;
      }
      if (fn === "getConversationAttention") {
        const cid = String(args[0] ?? "");
        return items.filter((i) => i.conversationId === cid) as unknown as T;
      }
      return items.slice(0, Number(args[0] ?? 50)) as unknown as T;
    }

    case "getRecentConversations": {
      const attentionThreads = new Set(demoAttentionItems().map((i) => i.conversationId));
      const rows = DEMO_CUSTOMERS.map((c) => {
        const needsAttention = attentionThreads.has(threadIdOf(c.id));
        return {
          threadId: threadIdOf(c.id),
          customerName: c.name,
          lastMessageText: demoScript(c).at(-1)?.text ?? "",
          lastMessageAtMs: demoLastTs(now - 7 * DAY, c.id),
          status: needsAttention ? ("needs_attention" as const) : ("answered" as const),
          responseTimeMs: needsAttention ? null : sampleInt(2500, 9000, "resp", c.id),
        };
      }).sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
      return rows.slice(0, Number(args[0] ?? 10)) as unknown as T;
    }

    case "getOpenAttentionCount":
      return demoAttentionItems().length as unknown as T;

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
      const attentionThreads = new Set(demoAttentionItems().map((i) => i.conversationId));
      const rows = DEMO_CUSTOMERS.map((c) => ({
        conversationId: threadIdOf(c.id),
        customerId: c.id,
        customerName: c.name,
        lastMessageText: demoScript(c).at(-1)?.text ?? "",
        lastMessageAtMs: demoLastTs(now - 7 * DAY, c.id),
        messageCount: c.msgs,
        status: attentionThreads.has(threadIdOf(c.id))
          ? ("attention" as const)
          : ("answered" as const),
      })) as Array<Record<string, unknown>>;
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

    case "getTopCustomers": {
      const sinceMs = Number(args[0]) || now - 7 * DAY;
      const limit = Number(args[1]) || 10;
      return DEMO_CUSTOMERS.map((c) => ({
        senderId: c.id,
        senderName: c.name,
        msgCount: c.msgs,
        lastTs: demoLastTs(sinceMs, c.id),
        isNew: c.interest === "new",
      }))
        .sort((a, b) => b.msgCount - a.msgCount)
        .slice(0, limit) as unknown as T;
    }

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
      const limit = Number(args[1]) || 10;
      const c = demoCustomerById(cid);
      if (!c) return [] as unknown as T;
      const attentionThreads = new Set(demoAttentionItems().map((i) => i.conversationId));
      return [
        {
          conversationId: threadIdOf(c.id),
          customerId: c.id,
          customerName: c.name,
          lastMessageText: demoScript(c).at(-1)?.text ?? "",
          lastMessageAtMs: demoLastTs(now - 7 * DAY, c.id),
          messageCount: c.msgs,
          status: attentionThreads.has(threadIdOf(c.id)) ? "attention" : "answered",
        },
      ].slice(0, limit) as unknown as T;
    }

    case "getConversationMessages": {
      const tid = String(args[0] ?? "");
      const c = DEMO_CUSTOMERS.find((x) => threadIdOf(x.id) === tid);
      // Thread không tồn tại -> [] để trang chi tiết trả 404 thật (như dữ liệu thật).
      if (!c) return [] as unknown as T;
      const script = demoScript(c);
      const startMs = demoLastTs(now - 7 * DAY, c.id) - script.length * 90_000;
      return script.map((m, i) => ({
        id: `msg_${tid}_${i + 1}`,
        senderId: m.direction === "incoming" ? c.id : "bot",
        senderName: m.direction === "incoming" ? c.name : "Senzu Bot",
        text: m.text,
        direction: m.direction,
        timestampMs: startMs + i * 90_000,
        frameTsMs: startMs + i * 90_000 + 800,
      })) as unknown as T;
    }

    case "getConversationProcessing": {
      const tid = String(args[0] ?? "");
      const c = DEMO_CUSTOMERS.find((x) => threadIdOf(x.id) === tid);
      if (!c) return [] as unknown as T;
      const script = demoScript(c);
      const startMs = demoLastTs(now - 7 * DAY, c.id) - script.length * 90_000;
      return script
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => m.direction === "incoming")
        .map(({ i }) => ({
          incomingMessageId: `msg_${tid}_${i + 1}`,
          receivedAtMs: startMs + i * 90_000,
          aiStartedAtMs: startMs + i * 90_000 + 900,
          aiCompletedAtMs: startMs + i * 90_000 + 3_200,
          sentAtMs: startMs + i * 90_000 + 3_800,
          aiProvider: "Google Gemini",
          aiModel: "gemini-1.5-pro",
          knowledgePath: "catalog/senzu.md",
          hasCatalog: true,
          status: "success",
          errorDetail: null,
        })) as unknown as T;
    }

    case "getCustomersWithInterest": {
      const opts = (args[0] ?? {}) as { search?: string; status?: string; limit?: number };
      const q = (opts.search || "").toLowerCase();
      return DEMO_CUSTOMERS.map((c) => ({
        customerId: c.id,
        customerName: c.name,
        totalMessages: c.msgs,
        totalConversations: 1,
        lastInteractionMs: demoLastTs(now - 30 * DAY, c.id),
        primaryProductName: c.product,
        otherProductsCount: sampleInt(0, 2, "others", c.id),
        interest: { status: c.interest, reasons: DEMO_REASONS[c.interest] },
      }))
        .filter((r) => (opts.status ? r.interest.status === opts.status : true))
        .filter((r) =>
          q
            ? r.customerName.toLowerCase().includes(q) || r.customerId.includes(q)
            : true
        )
        .sort((a, b) => b.lastInteractionMs - a.lastInteractionMs)
        .slice(0, opts.limit ?? 50) as unknown as T;
    }

    case "getCustomerDetail": {
      const id = String(args[0] ?? "");
      const c = demoCustomerById(id);
      // ID không tồn tại -> null để UI trả 404 thật (khớp dữ liệu thật).
      if (!c) return null as unknown as T;
      return {
        customerId: c.id,
        customerName: c.name,
        totalMessages: c.msgs,
        totalConversations: 1,
        firstInteractionMs: now - 45 * DAY,
        lastInteractionMs: demoLastTs(now - 30 * DAY, c.id),
      } as unknown as T;
    }

    case "getCustomerInterests": {
      const c = demoCustomerById(String(args[0] ?? ""));
      if (!c) return [] as unknown as T;
      return [
        {
          productId: "prod_demo_01",
          productName: c.product,
          totalMentions: sampleInt(2, 9, "mentions", c.id),
          priceCount: sampleInt(1, 5, "priceCount", c.id),
          orderCount: c.interest === "purchase_intent" ? sampleInt(1, 3, "orders", c.id) : 0,
          lastMentionAtMs: demoLastTs(now - 30 * DAY, c.id),
        },
      ] as unknown as T;
    }

    case "getCustomerPurchaseSignal": {
      const c = demoCustomerById(String(args[0] ?? ""));
      if (!c) return { totalProductQuestions: 0, orderMentions: 0 } as unknown as T;
      return {
        totalProductQuestions: sampleInt(2, 10, "questions", c.id),
        orderMentions: c.interest === "purchase_intent" ? sampleInt(1, 4, "orderMentions", c.id) : 0,
      } as unknown as T;
    }

    case "getCustomerNotes":
      return [
        { id: 1, authorEmail: "phan_nam_thanh@senzu.co.jp", authorName: "Nam Thanh", text: "Khách ưu tiên giao giờ hành chính, gọi điện trước khi giao 15p.", createdAtMs: now - 86400_000 },
        { id: 2, authorEmail: "nhan_vien@senzu.co.jp", authorName: "Nhân Viên Hỗ Trợ", text: "Khách đã chốt chuyển khoản VCB.", createdAtMs: now - 43200_000 },
      ] as unknown as T;

    case "getTopProducts": {
      // Quy mô theo số ngày trong kỳ — đổi bộ lọc ngày thì bảng đổi theo.
      const sinceMs = Number(args[0]) || now - 30 * DAY;
      const limit = Number(args[1]) || 10;
      const scale = Math.max(1, Math.round((now - sinceMs) / DAY)) / 30;
      return [
        { productId: "prod_01", productName: "Senzu Green Tea Serum 50ml", mentionCount: 142, uniqueCustomers: 68 },
        { productId: "prod_02", productName: "Kem Dưỡng Da Senzu Hydra Glow", mentionCount: 98, uniqueCustomers: 45 },
        { productId: "prod_03", productName: "Sữa Rửa Mặt Senzu Gentle Clean", mentionCount: 76, uniqueCustomers: 39 },
        { productId: "prod_04", productName: "Kem Chống Nắng Senzu SunShield SPF50+", mentionCount: 54, uniqueCustomers: 28 },
        { productId: "prod_05", productName: "Tẩy Trang Senzu Deep Micellar", mentionCount: 32, uniqueCustomers: 19 },
      ]
        .map((p) => ({
          ...p,
          mentionCount: Math.max(1, Math.round(p.mentionCount * scale)),
          uniqueCustomers: Math.max(1, Math.round(p.uniqueCustomers * scale)),
        }))
        .slice(0, limit) as unknown as T;
    }

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

    case "getCustomerActivityStats": {
      // Cùng công thức với getPeriodStats -> các KPI trên trang khách hàng khớp nhau.
      const [sinceMs, untilMs] = demoRange(args);
      const days = Math.max(1, Math.round((untilMs - sinceMs) / DAY));
      const active = Math.min(DEMO_CUSTOMERS.length, 6 + Math.round(days * 0.3));
      return {
        customersWithProductInterest: Math.round(active * 0.65),
        customersWithPurchaseSignal: Math.round(active * 0.3),
      } as unknown as T;
    }

    case "getResponseLatency":
      return { matchedCount: 380, incomingCount: 428, avgMs: 6420, medianMs: 4100, p90Ms: 14200 } as unknown as T;

    case "getCustomerSummary": {
      const sinceMs = Number(args[0]) || now - 7 * DAY;
      const days = Math.max(1, Math.round((now - sinceMs) / DAY));
      const total = Math.min(DEMO_CUSTOMERS.length, 6 + Math.round(days * 0.3));
      const fresh = Math.max(1, Math.round(total * 0.35));
      return {
        totalCustomers: total,
        newCustomers: fresh,
        returningCustomers: total - fresh,
      } as unknown as T;
    }

    case "insertCustomerNote":
      return null as unknown as T;

    case "getAllCustomers": {
      const limit = Number(args[0]) || 200;
      return DEMO_CUSTOMERS.map((c) => ({
        customerId: c.id,
        customerName: c.name,
        totalMessages: c.msgs,
        totalConversations: 1,
        lastInteractionMs: demoLastTs(now - 30 * DAY, c.id),
      }))
        .sort((a, b) => b.lastInteractionMs - a.lastInteractionMs)
        .slice(0, limit) as unknown as T;
    }

    case "getCustomerActivityTrend": {
      // "Khách mới" thưa (≈1/5 số ngày) để cộng dồn không vượt số khách trong kỳ.
      const [sinceMs, untilMs] = demoRange(args);
      return demoDays(sinceMs, untilMs).map((date) => {
        const active = sampleInt(8, 24, "active", date);
        const fresh = sample01("newCustomer", date) > 0.8 ? 1 : 0;
        return {
          date,
          activeCustomers: active,
          newCustomers: fresh,
          returningCustomers: Math.max(0, active - fresh),
        };
      }) as unknown as T;
    }

    case "getConversationVolumeTrend": {
      const [sinceMs, untilMs] = demoRange(args);
      return demoDays(sinceMs, untilMs).map((date) => {
        const incoming = sampleInt(28, 96, "incoming", date);
        return {
          date,
          customerMessages: incoming,
          aiReplies: Math.round(incoming * (0.85 + sample01("aiShare", date) * 0.12)),
          otherOutgoing: sampleInt(0, 6, "other", date),
        };
      }) as unknown as T;
    }

    case "getInterestSignalsTrend": {
      const [sinceMs, untilMs] = demoRange(args);
      return demoDays(sinceMs, untilMs).map((date) => ({
        date,
        productMentions: sampleInt(8, 34, "mentions", date),
        priceQuestions: sampleInt(3, 16, "price", date),
        informationQuestions: sampleInt(2, 14, "info", date),
        orderSignals: sampleInt(0, 7, "orders", date),
      })) as unknown as T;
    }

    default:
      // Không bao giờ trả [] im lặng: hàm chưa có mock sẽ làm UI hiểu nhầm là "rỗng".
      console.warn(
        `[senzu-api] Chưa có mock cho "${fn}" — trả về null. Bổ sung vào getMockData().`
      );
      return null as unknown as T;
  }
}
