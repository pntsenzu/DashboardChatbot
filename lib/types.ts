// Enums
export type ConversationStatus = "attention" | "active" | "answered";
export type InterestStatus = "purchase_intent" | "considering" | "new" | "inactive" | "unknown";
export type ProductQuestionType = "PRICE" | "FEATURE" | "AVAILABILITY" | "ORDER" | "GENERAL" | "OTHER";
export type AttentionEventType = "SYSTEM_ERROR" | "HUMAN_REQUEST_SIGNAL" | "LOW_CONFIDENCE" | "UNKNOWN_PRODUCT" | "UNKNOWN_PRICE" | "KNOWLEDGE_GAP";

// Volume & Metrics
export interface VolumePoint { bucket: string; incoming: number; outgoing: number; }
export interface HeatmapCell { weekday: number; hour: number; count: number; }
/** `lastTs` = `null` khi không xác định được tin cuối **trong kỳ** (kỳ đã kết thúc). */
export interface CustomerRow { senderId: string; senderName: string | null; msgCount: number; lastTs: number | null; isNew: boolean; }
export interface CustomerSummary { totalCustomers: number; newCustomers: number; returningCustomers: number; }
export interface LatencyStats { matchedCount: number; incomingCount: number; avgMs: number | null; medianMs: number | null; p90Ms: number | null; }
export interface DailyPerformancePoint { date: string; repliedRatio: number | null; avgLatencyMs: number | null; }
export interface PeriodStats { incomingCount: number; outgoingCount: number; distinctCustomers: number; avgLatencyMs: number | null; repliedRatio: number | null; }
export interface RecentMessage { id: string; threadId: string; senderId: string; senderName: string | null; text: string; direction: "incoming" | "outgoing"; timestampMs: number; }

// System & Attention
export interface AiInsightCounts { humanRequestCount: number; productGapCount: number; }
export interface SystemStatus {
  chromeRunning: boolean | null;
  messengerConnected: boolean | null;
  aiProvider: string | null;
  aiModel: string | null;
  knowledgeLoadedAtMs: number | null;
  catalogSyncedAtMs: number | null;
  catalogCount: number | null;
  lastTickAtMs: number | null;
  lastReplyAtMs: number | null;
  updatedAtMs: number | null;
  isStale: boolean;
}
export interface AttentionItem {
  id: number;
  type: AttentionEventType;
  severity: "info" | "warning" | "error";
  source: string;
  conversationId: string | null;
  customerId: string | null;
  customerName: string | null;
  messagePreview: string | null;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  createdAtMs: number;
}

// Conversations
export interface RecentConversation {
  threadId: string;
  customerName: string | null;
  lastMessageText: string;
  lastMessageAtMs: number;
  status: "answered" | "needs_attention";
  responseTimeMs: number | null;
}
export interface ConversationListItem {
  conversationId: string;
  customerId: string;
  customerName: string | null;
  lastMessageText: string;
  lastMessageAtMs: number;
  messageCount: number;
  status: ConversationStatus;
}
export interface ConversationMessage {
  id: string;
  senderId: string;
  senderName: string | null;
  text: string;
  direction: "incoming" | "outgoing";
  timestampMs: number;
  frameTsMs: number | null;
}
export interface MessageProcessing {
  incomingMessageId: string;
  receivedAtMs: number | null;
  aiStartedAtMs: number | null;
  aiCompletedAtMs: number | null;
  sentAtMs: number | null;
  aiProvider: string | null;
  aiModel: string | null;
  knowledgePath: string | null;
  hasCatalog: boolean | null;
  status: "success" | "failed";
  errorDetail: string | null;
}

// Customers
export interface InterestResult { status: InterestStatus; reasons: string[]; }
export interface CustomerListItem { customerId: string; customerName: string | null; totalMessages: number; totalConversations: number; lastInteractionMs: number; }
export interface CustomerListRow extends CustomerListItem { primaryProductName: string | null; otherProductsCount: number; interest: InterestResult; }
export interface CustomerDetail { customerId: string; customerName: string | null; totalMessages: number; totalConversations: number; firstInteractionMs: number; lastInteractionMs: number; }
export interface CustomerInterest { productId: string; productName: string | null; totalMentions: number; priceCount: number; orderCount: number; lastMentionAtMs: number; }
export interface CustomerPurchaseSignal { totalProductQuestions: number; orderMentions: number; }
export interface CustomerActivityStats { customersWithProductInterest: number; customersWithPurchaseSignal: number; }
export interface CustomerActivityPoint { date: string; activeCustomers: number; newCustomers: number; returningCustomers: number; }
export interface ConversationVolumePoint { date: string; customerMessages: number; aiReplies: number; otherOutgoing: number; }
export interface InterestSignalPoint { date: string; productMentions: number; priceQuestions: number; informationQuestions: number; orderSignals: number; }
export interface CustomerNote { id: number; authorEmail: string; authorName: string | null; text: string; createdAtMs: number; }

// Products
export interface TopProductRow { productId: string; productName: string | null; mentionCount: number; uniqueCustomers: number; }
export interface QuestionTypeCount { questionType: ProductQuestionType; count: number; uniqueCustomers: number; }
export interface ProductMentionSummary { total: number; resolved: number; unresolved: number; unresolvedRate: number | null; }
export interface UnknownProductMention { normalizedName: string; count: number; example: string; }
