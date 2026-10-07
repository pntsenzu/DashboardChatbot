/**
 * Lỗi của Senzu Data API — dùng được ở cả server lẫn client.
 *
 * File này KHÔNG import "server-only" để `app/error.tsx` (client component)
 * có thể hiển thị thông báo dễ hiểu.
 *
 * Quan trọng: khi ném lỗi từ Server Component, Next.js serialize nó thành
 * `{ digest, message, stack }` rồi gửi sang client — client nhận về `Error`
 * thường, KHÔNG phải instance `DataApiError`. Vì vậy `message` phải là văn
 * bản thân thiện ngay từ đầu; chi tiết kỹ thuật (HTTP status, body gốc)
 * nằm ở các trường riêng và chỉ server in ra log.
 */

export type DataApiErrorKind =
  /** Thiếu DATA_API_TOKEN ở production / cấu hình sai */
  | "config"
  /** 400 — JSON hỏng, body quá 64KB, args không phải mảng, hoặc tham số UI gửi sai */
  | "bad-request"
  /** 401 — thiếu/sai DATA_API_TOKEN */
  | "unauthorized"
  /** 404 — fn không thuộc whitelist, hoặc sai path/method */
  | "not-found"
  /** 500 — lỗi truy vấn phía Data API; 502/504 — service đang dừng */
  | "upstream"
  /** Quá thời gian chờ (AbortSignal.timeout) */
  | "timeout"
  /** Không kết nối được (DNS, TLS, mạng) */
  | "network"
  /** 200 nhưng body không đúng dạng `{ result: ... }` */
  | "bad-response"
  /** Lỗi không phân loại được */
  | "unknown";

export interface DataApiErrorInit {
  kind: DataApiErrorKind;
  /** Tên hàm RPC, vd "getPeriodStats". */
  fn: string;
  status?: number;
  /** Chi tiết kỹ thuật (đã cắt bớt). KHÔNG bao giờ chứa token. */
  body?: string;
  cause?: unknown;
  /** Ghi đè message mặc định. */
  message?: string;
}

/** Thông báo thân thiện (tiếng Việt) — hiển thị được cho người dùng. */
function friendlyMessage(init: DataApiErrorInit): string {
  const { kind, fn } = init;
  const status = init.status ?? 0;
  const body = (init.body ?? "").slice(0, 300);
  if (init.message) return init.message;

  switch (kind) {
    case "config":
      return `Cấu hình thiếu DATA_API_TOKEN nên không thể gọi ${fn}. Liên hệ quản trị viên để điền token vào .env.`;
    case "bad-request":
      return `Yêu cầu dữ liệu không hợp lệ (${fn}): ${body || "tham số sai"}.`;
    case "unauthorized":
      return `Máy chủ dữ liệu từ chối truy cập ${fn}: DATA_API_TOKEN sai hoặc đã bị thu hồi. Liên hệ quản trị viên Senzu cấp token mới.`;
    case "not-found":
      return `Hàm ${fn} không tồn tại trên máy chủ. Phiên bản Data API có thể đã cũ — báo team backend cập nhật.`;
    case "timeout":
      return `Máy chủ dữ liệu phản hồi quá chậm khi gọi ${fn} (${body}). Kiểm tra mạng hoặc thử lại sau.`;
    case "network":
      return `Không kết nối được tới máy chủ dữ liệu khi gọi ${fn}. Kiểm tra mạng hoặc biến DATA_API_URL.`;
    case "bad-response":
      return `Dữ liệu trả về từ ${fn} không đúng định dạng mà Data API cam kết.`;
    case "upstream":
      if (status === 500) {
        return `Máy chủ dữ liệu gặp lỗi khi truy vấn ${fn}. Vui lòng thử lại sau ít phút.`;
      }
      if (status >= 502 && status <= 504) {
        return `Máy chủ dữ liệu đang dừng hoặc khởi động lại (${fn}). Vui lòng thử lại sau.`;
      }
      return `Data API ${fn} lỗi HTTP ${status}: ${body}`;
    default:
      return status
        ? `Data API ${fn} lỗi HTTP ${status}: ${body}`
        : `Data API ${fn}: ${body || "lỗi không xác định"}`;
  }
}

export class DataApiError extends Error {
  readonly kind: DataApiErrorKind;
  /** 0 nếu lỗi trước khi có response (mạng, timeout, cấu hình). */
  readonly status: number;
  readonly fn: string;
  /** Chi tiết kỹ thuật cho log server. */
  readonly body: string;

  constructor(init: DataApiErrorInit) {
    super(friendlyMessage(init), init.cause !== undefined ? { cause: init.cause } : undefined);
    this.name = "DataApiError";
    this.kind = init.kind;
    this.status = init.status ?? 0;
    this.fn = init.fn;
    this.body = (init.body ?? "").slice(0, 300);
  }

  /** Dòng log cho server: message thân thiện + chi tiết kỹ thuật. */
  toLogString(): string {
    const detail = [this.status ? `HTTP ${this.status}` : "", this.body].filter(Boolean).join(" ");
    return `[senzu-api] ${this.message}${detail ? ` (${detail})` : ""}`;
  }
}

export function isDataApiError(error: unknown): error is DataApiError {
  return error instanceof DataApiError;
}

/**
 * Thông báo để hiển thị cho người dùng.
 *
 * Nhận cả instance (server) lẫn Error thường do Next serialize sang client —
 * nên fallback về `error.message` (đã thân thiện) thay vì chuỗi HTTP thô.
 */
export function describeApiError(error: unknown): string {
  if (isDataApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Máy chủ dữ liệu không phản hồi hoặc cấu hình chưa đúng.";
}
