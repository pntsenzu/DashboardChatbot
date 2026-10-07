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

import { DICT, fmt, type Locale } from "@/lib/i18n";

/**
 * Thông báo thân thiện — hiển thị được cho người dùng, dịch theo `locale`.
 * Cùng bảng chuỗi với `t.apiErrors` trong `lib/i18n.ts`.
 */
function friendlyMessage(init: DataApiErrorInit, locale: Locale = "vi"): string {
  const { kind, fn } = init;
  const status = init.status ?? 0;
  const body = (init.body ?? "").slice(0, 300);
  if (init.message) return init.message;

  const m = DICT[locale].apiErrors;

  switch (kind) {
    case "config":
      return fmt(m.config, { fn });
    case "bad-request":
      return fmt(m.badRequest, { fn, detail: body || m.badRequestDetail });
    case "unauthorized":
      return fmt(m.unauthorized, { fn });
    case "not-found":
      return fmt(m.notFound, { fn });
    case "timeout":
      return fmt(m.timeout, { fn });
    case "network":
      return fmt(m.network, { fn });
    case "bad-response":
      return fmt(m.badResponse, { fn });
    case "upstream":
      if (status === 500) return fmt(m.upstream500, { fn });
      if (status >= 502 && status <= 504) return fmt(m.upstreamGateway, { fn });
      return fmt(m.upstreamHttp, { fn, status, body });
    default:
      return status
        ? fmt(m.upstreamHttp, { fn, status, body })
        : fmt(m.unknownWithFn, { fn, detail: body || m.unknownDetail });
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
 * Lưu ý: lỗi ném từ server sang client chỉ giữ `{ message, digest }`, nên chỉ
 * dịch được khi còn nguyên instance `DataApiError`.
 */
export function describeApiError(error: unknown, locale: Locale = "vi"): string {
  if (isDataApiError(error)) {
    return friendlyMessage(
      { kind: error.kind, fn: error.fn, status: error.status, body: error.body },
      locale
    );
  }
  if (error instanceof Error && error.message) return error.message;
  return DICT[locale].apiErrors.unknown;
}
