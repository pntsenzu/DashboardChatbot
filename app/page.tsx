import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
import { cn, formatMs, formatDateTime, formatNumber } from "@/lib/utils";
import { startOfDayVN, toISODateVN } from "@/lib/date-range";
import type { AttentionEventType, AttentionItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Section, Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { TrendChart } from "@/components/ui/trend-chart";
import { EmptyState } from "@/components/ui/state";
import { MessageSquare, Bot } from "lucide-react";

export const revalidate = 30;

/**
 * Màu đường cho từng loại sự kiện — 6 loại / 5 tone nên hai loại "thiếu dữ liệu
 * sản phẩm" (UNKNOWN_PRODUCT, UNKNOWN_PRICE) dùng chung một màu có chủ đích.
 */
const ATTENTION_TONE: Record<
  AttentionEventType,
  "primary" | "info" | "success" | "warning" | "destructive"
> = {
  SYSTEM_ERROR: "destructive",
  HUMAN_REQUEST_SIGNAL: "warning",
  LOW_CONFIDENCE: "info",
  UNKNOWN_PRODUCT: "primary",
  UNKNOWN_PRICE: "primary",
  KNOWLEDGE_GAP: "success",
};

/** Badge & thanh tỉ trọng theo mức nghiêm trọng của sự kiện. */
const SEVERITY_BADGE: Record<
  AttentionItem["severity"],
  "destructive" | "warning" | "info"
> = { error: "destructive", warning: "warning", info: "info" };

const SEVERITY_BAR: Record<AttentionItem["severity"], string> = {
  error: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
};

const SEVERITY_RANK: Record<AttentionItem["severity"], number> = {
  error: 3,
  warning: 2,
  info: 1,
};

/** Tiêu đề tab theo ngôn ngữ hiện tại (định dạng "%s · Senzu Chatbot Dashboard"). */
export function generateMetadata() {
  return { title: getDict().overview.title };
}

export default async function OverviewPage() {
  const DAY = 86_400_000;
  const now = Date.now();
  const t = getDict();
  const dl = t.dateLocale;

  const [
    currentStats,
    prevStats,
    allAttentionItems,
    allRecentConvs,
    systemStatus,
    aiInsights,
    dailyTrend,
    volume,
    openAttentionItems,
  ] = await Promise.all([
    rpc("getPeriodStats", now - 7 * DAY, now),
    rpc("getPeriodStats", now - 14 * DAY, now - 7 * DAY),
    rpc("getAttentionItems", 50),
    rpc("getRecentConversations", 50),
    rpc("getSystemStatus"),
    rpc("getAiInsightCounts", now - 7 * DAY, now),
    rpc("getDailyPerformanceTrend", now - 7 * DAY, now),
    rpc("getVolume", now - 7 * DAY, "day"),
    // Nhóm R: sự kiện CHƯA giải quyết — nguồn cho khối phân tích theo loại/ngày.
    rpc("getOpenAttentionItems", 100),
  ]);

  // Hai khối dưới overline "Báo cáo 7 ngày gần nhất" PHẢI nằm trong đúng 7 ngày đó:
  // API chỉ trả sự kiện / hội thoại MỚI NHẤT, không lọc theo kỳ (DEF-13).
  const periodStart = now - 7 * DAY;
  const attentionItems = allAttentionItems
    .filter((item) => item.createdAtMs >= periodStart)
    .slice(0, 5);
  const recentConvs = allRecentConvs
    .filter((conv) => conv.lastMessageAtMs >= periodStart)
    .slice(0, 5);

  const calcDiff = (curr: number, prev: number): number | null => {
    // Không đủ dữ liệu so sánh -> null để UI hiện "—", tránh bịa ra +0%.
    if (!prev) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const incomingDiff = calcDiff(currentStats.incomingCount, prevStats.incomingCount);
  const customersDiff = calcDiff(currentStats.distinctCustomers, prevStats.distinctCustomers);

  const diffLabel = (d: number | null) =>
    d == null
      ? t.overview.diffNone
      : fmt(t.overview.diffVs, { p: d >= 0 ? `+${d}` : String(d) });

  const repliedPercent =
    currentStats.repliedRatio != null
      ? `${(currentStats.repliedRatio * 100).toFixed(1)}%`
      : t.overview.repliedUnknown;

  // Số liệu vẽ sparkline: null được lọc bên trong Sparkline (không hiện 0 giả).
  const incomingSeries = volume.map((v) => v.incoming);
  const latencySeries = dailyTrend.map((d) => d.avgLatencyMs);
  const repliedSeries = dailyTrend.map((d) =>
    d.repliedRatio == null ? null : Math.round(d.repliedRatio * 100)
  );

  // --- Nhóm R: phân tích sự kiện cần chú ý theo LOẠI và theo NGÀY ---
  // Lọc theo kỳ như 2 khối phía trên (DEF-13): API trả sự kiện mới nhất,
  // không tự lọc theo thời gian.
  const openItems = openAttentionItems.filter((item) => item.createdAtMs >= periodStart);

  // Gộp theo type — mức nghiêm trọng lấy mức cao nhất trong nhóm.
  const byType = new Map<AttentionEventType, { count: number; severity: AttentionItem["severity"] }>();
  for (const item of openItems) {
    const hit = byType.get(item.type);
    if (!hit) {
      byType.set(item.type, { count: 1, severity: item.severity });
    } else {
      hit.count += 1;
      if (SEVERITY_RANK[item.severity] > SEVERITY_RANK[hit.severity]) hit.severity = item.severity;
    }
  }
  const typeRows = [...byType.entries()].sort((a, b) => b[1].count - a[1].count);

  // Trục X = các ngày (giờ VN) nằm trong kỳ — đủ mốc 0 để thấy ngày không có
  // sự kiện, thay vì chỉ vẽ những ngày có sự kiện.
  const attentionDays: string[] = [];
  for (let ms = startOfDayVN(periodStart); ms < now && attentionDays.length < 31; ms += DAY) {
    attentionDays.push(toISODateVN(ms));
  }
  /** "YYYY-MM-DD" -> "DD/MM". */
  const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

  const countByDay = new Map<string, Map<AttentionEventType, number>>();
  for (const item of openItems) {
    const iso = toISODateVN(item.createdAtMs);
    const perType = countByDay.get(iso) ?? new Map<AttentionEventType, number>();
    perType.set(item.type, (perType.get(item.type) ?? 0) + 1);
    countByDay.set(iso, perType);
  }

  const attentionSeries = typeRows.map(([type]) => ({
    key: type,
    label: t.common.attentionType[type],
    tone: ATTENTION_TONE[type],
    values: attentionDays.map((iso) => countByDay.get(iso)?.get(type) ?? 0),
  }));

  /** Tỉ trọng 1 chữ số thập phân — không hiển thị khi chưa có sự kiện nào. */
  const shareOf = (count: number) =>
    openItems.length === 0
      ? "—"
      : fmt(t.overview.attentionShare, {
          p: (Math.round((count / openItems.length) * 1000) / 10).toLocaleString(dl),
        });

  return (
    <div className="space-y-4">
      <PageHeader
        overline={t.overview.overline}
        title={t.overview.title}
        description={t.overview.description}
        action={
          <Link href="/conversations" className={buttonVariants({ size: "sm" })}>
            <MessageSquare aria-hidden="true" /> {t.common.viewConversations}
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
              <span className="t-section">{t.overview.botTitle}</span>
              {systemStatus.isStale ? (
                <Badge variant="destructive">{t.overview.botStale}</Badge>
              ) : (
                <Badge variant="success">{t.overview.botOk}</Badge>
              )}
            </div>
            <p className="t-meta">
              {t.overview.botModelLabel} <b>{systemStatus.aiModel || "Gemini 1.5 Pro"}</b> ·{" "}
              {t.overview.botCatalogLabel}{" "}
              <b>
                {formatNumber(systemStatus.catalogCount ?? 148, dl)} {t.overview.botCatalogUnit}
              </b>
            </p>
          </div>
        </div>
        <div className="t-meta flex gap-4 border-l border-border pl-4">
          <div>
            <div>
              {t.overview.botTick}{" "}
              <span className="tabular font-mono text-foreground">
                {formatDateTime(systemStatus.lastTickAtMs, dl)}
              </span>
            </div>
            <div>
              {t.overview.botReply}{" "}
              <span className="tabular font-mono text-foreground">
                {formatDateTime(systemStatus.lastReplyAtMs, dl)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI: một khung hairline, ô bấm được = liên kết trang chi tiết (§11) */}
      <MetricGrid aria-label={t.overview.kpiGridAria}>
        <Metric
          href="/volume"
          label={t.overview.kpiIncoming}
          value={formatNumber(currentStats.incomingCount, dl)}
          meta={diffLabel(incomingDiff)}
          sparkline={<Sparkline data={incomingSeries} label={t.overview.sparkIncoming} tone="info" />}
        />
        <Metric
          href="/customers"
          label={t.overview.kpiCustomers}
          value={formatNumber(currentStats.distinctCustomers, dl)}
          meta={diffLabel(customersDiff)}
        />
        <Metric
          href="/volume"
          label={t.overview.kpiLatency}
          value={formatMs(currentStats.avgLatencyMs)}
          valueClassName={currentStats.avgLatencyMs == null ? "text-muted-foreground" : undefined}
          meta={t.overview.kpiLatencyMeta}
          sparkline={
            <Sparkline data={latencySeries} label={t.overview.sparkLatency} tone="warning" unit="ms" />
          }
        />
        <Metric
          href="/volume"
          label={t.overview.kpiReplied}
          value={repliedPercent}
          valueClassName={
            currentStats.repliedRatio == null
              ? "text-muted-foreground"
              : currentStats.repliedRatio >= 0.9
                ? "text-success"
                : "text-warning"
          }
          meta={t.overview.kpiRepliedMeta}
          sparkline={
            <Sparkline data={repliedSeries} label={t.overview.sparkReplied} tone="success" unit="%" />
          }
        />
      </MetricGrid>

      {/* Cảnh báo AI — Alert thay vì Card (§13), chỉ hiện khi thật sự có việc */}
      <div className="space-y-2">
        {aiInsights.humanRequestCount > 0 ? (
          <Alert
            variant="warning"
            title={fmt(t.overview.alertHumanTitle, { n: aiInsights.humanRequestCount })}
            description={t.overview.alertHumanDesc}
            action={
              <Link href="/conversations?status=attention" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t.overview.alertHumanAction}
              </Link>
            }
          />
        ) : null}

        {aiInsights.productGapCount > 0 ? (
          <Alert
            variant="info"
            title={fmt(t.overview.alertGapTitle, { n: aiInsights.productGapCount })}
            description={t.overview.alertGapDesc}
            action={
              <Link href="/knowledge" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t.overview.alertGapAction}
              </Link>
            }
          />
        ) : null}

        {aiInsights.humanRequestCount === 0 && aiInsights.productGapCount === 0 ? (
          <Alert
            variant="success"
            title={t.overview.alertOkTitle}
            description={t.overview.alertOkDesc}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          titleId="attention-section"
          title={t.overview.attentionTitle}
          description={fmt(t.overview.attentionCount, { n: attentionItems.length })}
          action={
            <Link href="/conversations?status=attention" className="t-meta text-primary hover:underline">
              {t.overview.attentionAll}
            </Link>
          }
        >
          <Card>
            {attentionItems.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={t.overview.attentionEmptyTitle}
                  description={t.overview.attentionEmptyDesc}
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
                      {formatDateTime(item.createdAtMs, dl)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>

        <Section
          titleId="recent-section"
          title={t.overview.recentTitle}
          description={fmt(t.overview.recentCount, { n: recentConvs.length })}
          action={
            <Link href="/conversations" className="t-meta text-primary hover:underline">
              {t.overview.recentAction}
            </Link>
          }
        >
          <Card>
            {recentConvs.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={t.overview.recentEmptyTitle}
                  description={t.overview.recentEmptyDesc}
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
                          {conv.status === "needs_attention"
                            ? t.common.status.attention
                            : t.common.status.answered}
                        </Badge>
                      </span>
                      <span className="t-meta block min-w-0 truncate text-foreground">
                        {conv.lastMessageText}
                      </span>
                      <span className="block text-2xs tabular text-muted-foreground">
                        {formatDateTime(conv.lastMessageAtMs, dl)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>
      </div>

      {/* Nhóm R — phân tích sự kiện cần chú ý theo loại & theo ngày
          (getOpenAttentionItems: chưa trang nào dùng trước đây). */}
      <Section
        titleId="attention-stats"
        title={t.overview.attentionStatsTitle}
        description={fmt(t.overview.attentionStatsDesc, {
          n: formatNumber(openItems.length, dl),
        })}
        action={
          <Link
            href="/conversations?status=attention"
            className="t-meta text-primary hover:underline"
          >
            {t.overview.attentionAll}
          </Link>
        }
      >
        <Card>
          {openItems.length === 0 ? (
            <CardContent>
              <EmptyState
                title={t.overview.attentionStatsEmptyTitle}
                description={t.overview.attentionStatsEmptyDesc}
              />
            </CardContent>
          ) : (
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <span className="t-section block">{t.overview.attentionByType}</span>
                  <ul className="space-y-3">
                    {typeRows.map(([type, row]) => (
                      <li key={type} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant={SEVERITY_BADGE[row.severity]}>
                            {t.common.attentionType[type]}
                          </Badge>
                          <span className="t-label tabular">
                            {formatNumber(row.count, dl)}
                            <span className="t-meta ml-1.5">{shareOf(row.count)}</span>
                          </span>
                        </div>
                        {/* Thanh tỉ trọng chỉ là hình ảnh kèm — con số đã có ở trên. */}
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div
                            className={cn("h-full rounded-full", SEVERITY_BAR[row.severity])}
                            style={{ width: `${(row.count / openItems.length) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="t-meta">
                    {fmt(t.overview.attentionTotal, { n: formatNumber(openItems.length, dl) })}
                  </p>
                </div>

                <TrendChart
                  title={t.overview.attentionTimeline}
                  description={t.overview.attentionTimelineDesc}
                  categories={attentionDays.map(dayLabel)}
                  series={attentionSeries}
                />
              </div>
            </CardContent>
          )}
        </Card>
      </Section>

    </div>
  );
}
