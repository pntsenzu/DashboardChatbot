import "server-only";

/**
 * true khi mọi dữ liệu đang là dữ liệu mẫu (không có DATA_API_TOKEN).
 * Dùng để UI gắn cờ "Dữ liệu mẫu" — không bao giờ để người dùng tưởng là số thật.
 */
export function isMockMode(): boolean {
  return !hasRealToken();
}

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function hasRealToken(): boolean {
  return Boolean(process.env.DATA_API_TOKEN?.trim());
}

/**
 * Gọi một hàm của Senzu Data API.
 *
 * Quy tắc (data-api §9):
 * - Có token -> PHẢI gọi thật; HTTP != 200 hoặc lỗi mạng -> ném lỗi (không rơi về mock).
 * - Không token -> chỉ được dùng mock ở development / lúc build;
 *   ở production runtime phải ném lỗi cấu hình thay vì trả dữ liệu giả.
 */
export async function rpc<T>(fn: string, ...args: unknown[]): Promise<T> {
  const url = process.env.DATA_API_URL || "https://api-bot.senzu-base.vn";
  const token = process.env.DATA_API_TOKEN?.trim();

  if (!token) {
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      throw new Error(
        `Cấu hình thiếu DATA_API_TOKEN: không thể gọi ${fn} và không được dùng dữ liệu mẫu ở production.`
      );
    }
    console.warn(`[senzu-api] DATA_API_TOKEN trống -> dùng dữ liệu MẪU cho ${fn}.`);
    return getMockData<T>(fn, args);
  }

  const res = await fetch(`${url}/rpc`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fn, args }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Data API ${fn} HTTP ${res.status}: ${errorText.slice(0, 300)}`);
  }

  const json = (await res.json()) as { result: T };
  return json.result;
}

function getMockData<T>(fn: string, args: unknown[]): T {
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
    case "getVolume":
      return Array.from({ length: 7 }, (_, i) => ({
        bucket: new Date(now - (6 - i) * DAY).toISOString().slice(0, 10),
        incoming: Math.floor(40 + Math.random() * 50),
        outgoing: Math.floor(38 + Math.random() * 48),
      })) as unknown as T;

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
        const weekday = (i % 7) + 1;
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
