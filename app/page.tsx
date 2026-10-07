import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { formatMs, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  ArrowUpRight, 
  Bot
} from "lucide-react";

export const revalidate = 30;

export default async function OverviewPage() {
  const DAY = 86_400_000;
  const now = Date.now();

  const [currentStats, prevStats, attentionItems, recentConvs, systemStatus, aiInsights] = await Promise.all([
    rpc("getPeriodStats", now - 7 * DAY, now),
    rpc("getPeriodStats", now - 14 * DAY, now - 7 * DAY),
    rpc("getAttentionItems", 5),
    rpc("getRecentConversations", 5),
    rpc("getSystemStatus"),
    rpc("getAiInsightCounts", now - 7 * DAY, now),
  ]);

  const calcDiff = (curr: number, prev: number): number | null => {
    // Không đủ dữ liệu so sánh -> null để UI hiện "—", tránh bịa ra +0%.
    if (!prev) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const incomingDiff = calcDiff(currentStats.incomingCount, prevStats.incomingCount);
  const customersDiff = calcDiff(currentStats.distinctCustomers, prevStats.distinctCustomers);

  const diffLabel = (d: number | null) =>
    d == null ? "—" : d >= 0 ? `+${d}%` : `${d}%`;

  const repliedPercent =
    currentStats.repliedRatio != null
      ? `${(currentStats.repliedRatio * 100).toFixed(1)}%`
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="t-overline text-primary">Báo cáo 7 ngày gần nhất</span>
          <h1 className="t-page">Tổng quan hoạt động Chatbot</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/conversations">
            <Button variant="default" size="sm">
              <MessageSquare className="w-4 h-4" /> Xem hội thoại
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-border bg-card shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground grid place-items-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="t-section">Trạng thái Bot Messenger</span>
              {systemStatus.isStale ? (
                <Badge variant="destructive">Dừng hoạt động (Stale)</Badge>
              ) : (
                <Badge variant="success">Hoạt động tốt</Badge>
              )}
            </div>
            <p className="t-meta">
              Model AI: <b>{systemStatus.aiModel || "Gemini 1.5 Pro"}</b> · Danh mục sản phẩm: <b>{systemStatus.catalogCount ?? 148} SP</b>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 t-meta border-l border-border pl-4">
          <div>
            <div>Tick cuối: <span className="font-mono text-foreground tabular">{formatDateTime(systemStatus.lastTickAtMs)}</span></div>
            <div>Reply cuối: <span className="font-mono text-foreground tabular">{formatDateTime(systemStatus.lastReplyAtMs)}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="t-meta">Tin nhắn đến</span>
            <span className={incomingDiff == null ? "t-meta font-medium text-muted-foreground" : incomingDiff >= 0 ? "t-meta font-semibold text-success" : "t-meta font-semibold text-destructive"}>
              {diffLabel(incomingDiff)}
            </span>
          </div>
          <div className="t-metric tabular">{currentStats.incomingCount.toLocaleString()}</div>
          <div className="t-meta text-2xs">So với 7 ngày trước ({prevStats.incomingCount.toLocaleString()})</div>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="t-meta">Khách hàng riêng biệt</span>
            <span className={customersDiff == null ? "t-meta font-medium text-muted-foreground" : customersDiff >= 0 ? "t-meta font-semibold text-success" : "t-meta font-semibold text-destructive"}>
              {diffLabel(customersDiff)}
            </span>
          </div>
          <div className="t-metric tabular">{currentStats.distinctCustomers.toLocaleString()}</div>
          <div className="t-meta text-2xs">So với 7 ngày trước ({prevStats.distinctCustomers.toLocaleString()})</div>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="t-meta">Độ trễ phản hồi TB</span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="t-metric tabular">{formatMs(currentStats.avgLatencyMs)}</div>
          <div className="t-meta text-2xs">Ước lượng thời gian ghép tin</div>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="t-meta">Tỉ lệ trả lời</span>
            {currentStats.repliedRatio != null ? (
              <Badge variant={currentStats.repliedRatio >= 0.9 ? "success" : "warning"}>
                {repliedPercent}
              </Badge>
            ) : (
              <Badge variant="default">Chưa rõ</Badge>
            )}
          </div>
          <div className="t-metric tabular">{repliedPercent}</div>
          <div className="t-meta text-2xs">Tỉ lệ phản hồi thành công</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-warning-border bg-warning-subtle flex items-center justify-between">
          <div>
            <span className="t-overline text-warning">Yêu cầu gặp nhân viên</span>
            <div className="t-metric text-warning tabular">{aiInsights.humanRequestCount} lần</div>
            <div className="t-meta">Khách chủ động yêu cầu nói chuyện với tư vấn viên</div>
          </div>
          <AlertCircle className="w-8 h-8 text-warning" />
        </div>

        <div className="p-4 rounded-lg border border-info-border bg-info-subtle flex items-center justify-between">
          <div>
            <span className="t-overline text-info">Sản phẩm ngoài catalog</span>
            <div className="t-metric text-info tabular">{aiInsights.productGapCount} sản phẩm</div>
            <div className="t-meta">Tên sản phẩm khách hỏi nhưng chưa có trong tri thức</div>
          </div>
          <HelpCircle className="w-8 h-8 text-info" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="t-card flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" /> Sự kiện cần chú ý
            </h3>
            <Link href="/conversations?status=attention" className="t-meta text-primary hover:underline flex items-center gap-1">
              Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {attentionItems.length === 0 ? (
              <p className="t-meta py-4 text-center">Không có sự kiện nào cần xử lý.</p>
            ) : (
              attentionItems.map((item) => (
                <div key={item.id} className="p-3 rounded border border-border bg-muted/40 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="t-label font-semibold">{item.customerName || item.customerId}</span>
                    <Badge variant={item.severity === "error" ? "destructive" : item.severity === "warning" ? "warning" : "info"}>
                      {item.type}
                    </Badge>
                  </div>
                  <p className="t-meta text-foreground line-clamp-1">{item.messagePreview || item.detail}</p>
                  <div className="t-meta text-2xs mt-1 tabular">{formatDateTime(item.createdAtMs)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="t-card flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Hội thoại vừa hoạt động
            </h3>
            <Link href="/conversations" className="t-meta text-primary hover:underline flex items-center gap-1">
              Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {recentConvs.length === 0 ? (
              <p className="t-meta py-4 text-center" role="status">
                Chưa có hội thoại nào hoạt động trong thời gian gần đây.
              </p>
            ) : (
              recentConvs.map((conv) => (
              <Link
                key={conv.threadId}
                href={`/conversations/${conv.threadId}`}
                className="block p-3 rounded border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="t-label font-semibold">{conv.customerName || conv.threadId}</span>
                  <Badge variant={conv.status === "needs_attention" ? "warning" : "success"}>
                    {conv.status === "needs_attention" ? "Cần chú ý" : "Đã trả lời"}
                  </Badge>
                </div>
                <p className="t-meta text-foreground line-clamp-1">{conv.lastMessageText}</p>
                <div className="t-meta text-2xs mt-1 tabular">{formatDateTime(conv.lastMessageAtMs)}</div>
              </Link>
            ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
