import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { formatMs, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Section, Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { EmptyState } from "@/components/ui/state";
import { MessageSquare, Bot } from "lucide-react";

export const revalidate = 30;

export default async function OverviewPage() {
  const DAY = 86_400_000;
  const now = Date.now();

  const [
    currentStats,
    prevStats,
    attentionItems,
    recentConvs,
    systemStatus,
    aiInsights,
    dailyTrend,
    volume,
  ] = await Promise.all([
    rpc("getPeriodStats", now - 7 * DAY, now),
    rpc("getPeriodStats", now - 14 * DAY, now - 7 * DAY),
    rpc("getAttentionItems", 5),
    rpc("getRecentConversations", 5),
    rpc("getSystemStatus"),
    rpc("getAiInsightCounts", now - 7 * DAY, now),
    rpc("getDailyPerformanceTrend", now - 7 * DAY, now),
    rpc("getVolume", now - 7 * DAY, "day"),
  ]);

  const calcDiff = (curr: number, prev: number): number | null => {
    // Không đủ dữ liệu so sánh -> null để UI hiện "—", tránh bịa ra +0%.
    if (!prev) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const incomingDiff = calcDiff(currentStats.incomingCount, prevStats.incomingCount);
  const customersDiff = calcDiff(currentStats.distinctCustomers, prevStats.distinctCustomers);

  const diffLabel = (d: number | null) =>
    d == null ? "không có kỳ trước" : d >= 0 ? `+${d}% vs 7 ngày trước` : `${d}% vs 7 ngày trước`;

  const repliedPercent =
    currentStats.repliedRatio != null
      ? `${(currentStats.repliedRatio * 100).toFixed(1)}%`
      : "Chưa rõ";

  // Số liệu vẽ sparkline: null được lọc bên trong Sparkline (không hiện 0 giả).
  const incomingSeries = volume.map((v) => v.incoming);
  const latencySeries = dailyTrend.map((d) => d.avgLatencyMs);
  const repliedSeries = dailyTrend.map((d) =>
    d.repliedRatio == null ? null : Math.round(d.repliedRatio * 100)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Báo cáo 7 ngày gần nhất"
        title="Tổng quan hoạt động Chatbot"
        description="Số liệu cập nhật theo thời gian thực từ Data API"
        action={
          <Link href="/conversations" className={buttonVariants({ size: "sm" })}>
            <MessageSquare aria-hidden="true" /> Xem hội thoại
          </Link>
        }
      />

      {/* Trạng thái bot — luôn kèm chữ, không chỉ màu (§15) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-section">Trạng thái Bot Messenger</span>
              {systemStatus.isStale ? (
                <Badge variant="destructive">Dừng hoạt động (Stale)</Badge>
              ) : (
                <Badge variant="success">Hoạt động tốt</Badge>
              )}
            </div>
            <p className="t-meta">
              Model AI: <b>{systemStatus.aiModel || "Gemini 1.5 Pro"}</b> · Danh mục sản phẩm:{" "}
              <b>{systemStatus.catalogCount ?? 148} SP</b>
            </p>
          </div>
        </div>
        <div className="t-meta flex gap-4 border-l border-border pl-4">
          <div>
            <div>
              Tick cuối:{" "}
              <span className="tabular font-mono text-foreground">
                {formatDateTime(systemStatus.lastTickAtMs)}
              </span>
            </div>
            <div>
              Reply cuối:{" "}
              <span className="tabular font-mono text-foreground">
                {formatDateTime(systemStatus.lastReplyAtMs)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI: một khung hairline, ô bấm được = liên kết trang chi tiết (§11) */}
      <MetricGrid aria-label="Chỉ số 7 ngày gần nhất">
        <Metric
          href="/volume"
          label="Tin nhắn đến"
          value={currentStats.incomingCount.toLocaleString()}
          meta={diffLabel(incomingDiff)}
          sparkline={<Sparkline data={incomingSeries} label="Tin nhắn đến theo ngày" tone="info" />}
        />
        <Metric
          href="/customers"
          label="Khách hàng riêng biệt"
          value={currentStats.distinctCustomers.toLocaleString()}
          meta={diffLabel(customersDiff)}
        />
        <Metric
          href="/volume"
          label="Độ trễ phản hồi TB"
          value={formatMs(currentStats.avgLatencyMs)}
          valueClassName={currentStats.avgLatencyMs == null ? "text-muted-foreground" : undefined}
          meta="Thời gian ghép tin trung bình"
          sparkline={
            <Sparkline data={latencySeries} label="Độ trễ phản hồi theo ngày" tone="warning" unit="ms" />
          }
        />
        <Metric
          href="/volume"
          label="Tỉ lệ trả lời"
          value={repliedPercent}
          valueClassName={
            currentStats.repliedRatio == null
              ? "text-muted-foreground"
              : currentStats.repliedRatio >= 0.9
                ? "text-success"
                : "text-warning"
          }
          meta="Tỉ lệ phản hồi thành công"
          sparkline={
            <Sparkline data={repliedSeries} label="Tỉ lệ trả lời theo ngày" tone="success" unit="%" />
          }
        />
      </MetricGrid>

      {/* Cảnh báo AI — Alert thay vì Card (§13), chỉ hiện khi thật sự có việc */}
      <div className="space-y-2">
        {aiInsights.humanRequestCount > 0 ? (
          <Alert
            variant="warning"
            title={`Yêu cầu gặp nhân viên: ${aiInsights.humanRequestCount} lần`}
            description="Khách chủ động yêu cầu nói chuyện với tư vấn viên trong 7 ngày qua."
            action={
              <Link href="/conversations?status=attention" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Mở danh sách
              </Link>
            }
          />
        ) : null}

        {aiInsights.productGapCount > 0 ? (
          <Alert
            variant="info"
            title={`Sản phẩm ngoài catalog: ${aiInsights.productGapCount} sản phẩm`}
            description="Tên sản phẩm khách hỏi nhưng chưa có trong kho tri thức."
            action={
              <Link href="/knowledge" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Xem tri thức
              </Link>
            }
          />
        ) : null}

        {aiInsights.humanRequestCount === 0 && aiInsights.productGapCount === 0 ? (
          <Alert
            variant="success"
            title="Không có cảnh báo trong 7 ngày qua"
            description="Không phát hiện yêu cầu gặp nhân viên hay sản phẩm ngoài catalog."
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section
          titleId="attention-section"
          title="Sự kiện cần chú ý"
          description={`${attentionItems.length} mục`}
          action={
            <Link href="/conversations?status=attention" className="t-meta text-primary hover:underline">
              Xem tất cả
            </Link>
          }
        >
          <Card>
            {attentionItems.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Không có sự kiện nào cần xử lý"
                  description="Khi khách chờ lâu hoặc bot gặp lỗi, mục này sẽ xuất hiện."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {attentionItems.map((item) => (
                  <li key={item.id} className="flex min-w-0 flex-col gap-1 p-3 hover:bg-muted/50 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-label min-w-0 truncate">{item.customerName || item.customerId}</span>
                      <Badge
                        variant={
                          item.severity === "error"
                            ? "destructive"
                            : item.severity === "warning"
                              ? "warning"
                              : "info"
                        }
                      >
                        {item.type}
                      </Badge>
                    </div>
                    <p className="t-meta min-w-0 truncate text-foreground">
                      {item.messagePreview || item.detail}
                    </p>
                    <span className="text-2xs tabular text-muted-foreground">
                      {formatDateTime(item.createdAtMs)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>

        <Section
          titleId="recent-section"
          title="Hội thoại vừa hoạt động"
          description={`${recentConvs.length} hội thoại`}
          action={
            <Link href="/conversations" className="t-meta text-primary hover:underline">
              Chi tiết
            </Link>
          }
        >
          <Card>
            {recentConvs.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Chưa có hội thoại nào"
                  description="Hội thoại sẽ xuất hiện khi khách nhắn tin Messenger."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentConvs.map((conv) => (
                  <li key={conv.threadId}>
                    <Link
                      href={`/conversations/${conv.threadId}`}
                      className="block min-w-0 p-3 transition-colors hover:bg-muted/50 sm:p-4"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="t-label min-w-0 truncate">
                          {conv.customerName || conv.threadId}
                        </span>
                        <Badge variant={conv.status === "needs_attention" ? "warning" : "success"}>
                          {conv.status === "needs_attention" ? "Cần chú ý" : "Đã trả lời"}
                        </Badge>
                      </span>
                      <span className="t-meta block min-w-0 truncate text-foreground">
                        {conv.lastMessageText}
                      </span>
                      <span className="block text-2xs tabular text-muted-foreground">
                        {formatDateTime(conv.lastMessageAtMs)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>
      </div>

    </div>
  );
}
