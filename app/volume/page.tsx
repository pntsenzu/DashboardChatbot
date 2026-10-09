import React from "react";
import { rpc } from "@/lib/senzu-api";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
import { formatMs, formatDateTime, formatNumber } from "@/lib/utils";
import { fillDailyTrend, resolveRange, toISODateVN } from "@/lib/date-range";
import {
  getHeatmapInRange,
  getLatencyInRange,
  getTopCustomersInRange,
  needsEndBound,
} from "@/lib/range-aggregates";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Section, Card, CardContent } from "@/components/ui/card";
import { TrendChart } from "@/components/ui/trend-chart";
import { Heatmap } from "@/components/ui/heatmap";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Số liệu phân tích lấy theo bộ lọc trên URL -> dynamic (cookie locale + query).
export const dynamic = "force-dynamic";

/** Tiêu đề tab theo ngôn ngữ hiện tại (định dạng "%s · Senzu Chatbot Dashboard"). */
export function generateMetadata() {
  return { title: getDict().volume.title };
}

interface SearchParams {
  range?: string;
  from?: string;
  to?: string;
}

export default async function VolumePage({ searchParams }: { searchParams: SearchParams }) {
  const now = Date.now();
  const t = getDict();
  const dl = t.dateLocale;
  const range = resolveRange(searchParams, now);
  const { sinceMs, untilMs, groupBy, preset } = range;

  // Kỳ đã kết thúc: Heatmap / Top khách / Độ trễ chỉ được API tính từ `sinceMs`
  // -> bù thêm tham số `untilMs` để mọi bảng cùng một kỳ (DEF-07).
  const bounded = needsEndBound(untilMs, now);

  const [volume, latency, topCustomers, heatmap, customersPerBucket, replyTrend] =
    await Promise.all([
      rpc("getVolume", sinceMs, groupBy, untilMs),
      getLatencyInRange(sinceMs, untilMs, bounded),
      getTopCustomersInRange(sinceMs, untilMs, 10, bounded),
      getHeatmapInRange(sinceMs, untilMs, bounded),
      // Nhóm R: 2 hàm chưa trang nào dùng — số khách/bucket và nguồn tin trả lời.
      rpc("getCustomersPerBucket", sinceMs, groupBy, untilMs),
      rpc("getConversationVolumeTrend", sinceMs, untilMs),
    ]);

  // Cùng lỗi DEF-14: nguồn tin trả lời theo ngày cũng sparse -> bù ngày 0.
  const replyDays = fillDailyTrend(replyTrend, sinceMs, untilMs, {
    customerMessages: 0,
    aiReplies: 0,
    otherOutgoing: 0,
  });

  // Tỷ lệ tin trả lời do AI đảm nhiệm = aiReplies / (aiReplies + otherOutgoing).
  // Không có tin trả lời trong kỳ -> `null` để hiện đúng câu "chưa có dữ liệu",
  // KHÔNG hiện 0% (spec §11.2).
  const totalAi = replyTrend.reduce((sum, d) => sum + d.aiReplies, 0);
  const totalOther = replyTrend.reduce((sum, d) => sum + d.otherOutgoing, 0);
  const totalReplies = totalAi + totalOther;
  const aiShare =
    totalReplies > 0 ? `${((totalAi / totalReplies) * 100).toFixed(1)}%` : null;

  /** Ngày theo giờ VN, vd "01/10/2026". */
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString(dl, {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  /**
   * "Tin nhắn cuối" trong kỳ đã chọn — `null` (hiện "—") nghĩa là không xác định
   * được mốc trong kỳ (tin cuối nằm sau ngày kết thúc), không hiển thị ngày ngoài kỳ.
   */
  const fmtLastMessage = (ts: number | null) =>
    ts == null ? "—" : formatDateTime(ts, dl);
  const lastMessageTitle = (ts: number | null) =>
    ts == null ? t.volume.lastMessageUnknown : undefined;

  const isHour = groupBy === "hour";

  /** Bucket "YYYY-MM-DD" (ngày) hoặc "YYYY-MM-DDTHH" (giờ) -> nhãn trục X. */
  const bucketLabel = (bucket: string) => {
    const day = `${bucket.slice(8, 10)}/${bucket.slice(5, 7)}`;
    if (!isHour) return day;
    const hour = bucket.match(/[T ](\d{2})/);
    return hour ? `${day} ${hour[1]}` : day;
  };

  // Kỳ đã kết thúc (Hôm qua / Tháng trước / Tùy chọn quá khứ): số liệu đã được
  // bù về đúng kỳ, nhưng P50/P90 không cộng dồn được -> ghi rõ, không im lặng.
  const endedInPast = untilMs < now - 60_000;

  return (
    <div className="space-y-4">
      <PageHeader
        overline={t.volume.overline}
        title={t.volume.title}
        description={fmt(t.volume.description, { from: fmtDate(sinceMs), to: fmtDate(untilMs - 1) })}
      />

      {/* Bộ lọc ngày — trạng thái nằm trên URL (?range=&from=&to=) */}
      <DateRangeFilter
        preset={preset}
        from={preset === "custom" ? (searchParams.from ?? "") : toISODateVN(sinceMs)}
        to={
          preset === "custom"
            ? (searchParams.to ?? toISODateVN(untilMs - 1))
            : toISODateVN(untilMs - 1)
        }
      />
      {range.fallback ? (
        <p className="t-meta text-warning" role="status">
          {t.range.invalid}
        </p>
      ) : null}
      {endedInPast ? (
        <p className="t-meta" role="note">
          {t.volume.aggregateNote}
        </p>
      ) : null}

      {/* KPI độ trễ — một khung hairline, không tách mỗi con số ra một Card (§11) */}
      <MetricGrid className="sm:grid-cols-3" aria-label={t.volume.latencyGridAria}>
        <Metric
          label={t.volume.latencyAvg}
          value={formatMs(latency.avgMs)}
          valueClassName={latency.avgMs == null ? "text-muted-foreground" : undefined}
          meta={
            latency.matchedCount > 0
              ? fmt(t.volume.latencyAvgMetaMatched, {
                  matched: formatNumber(latency.matchedCount, dl),
                  total: formatNumber(latency.incomingCount, dl),
                })
              : t.volume.latencyAvgMetaEmpty
          }
        />
        <Metric
          label={t.volume.latencyMedian}
          value={formatMs(latency.medianMs)}
          valueClassName="text-info"
          meta={t.volume.latencyMedianMeta}
        />
        <Metric
          label={t.volume.latencyP90}
          value={formatMs(latency.p90Ms)}
          valueClassName={latency.p90Ms == null ? "text-muted-foreground" : "text-warning"}
          meta={t.volume.latencyP90Meta}
        />
      </MetricGrid>

      <Section
        titleId="volume-trend"
        title={isHour ? t.volume.trendTitleHour : t.volume.trendTitle}
        description={t.volume.trendDesc}
      >
        <Card>
          <CardContent className="space-y-4">
            {volume.length === 0 ? (
              <p className="t-meta" role="status">
                {t.volume.volumeEmpty}
              </p>
            ) : (
              <>
                <TrendChart
                  title={isHour ? t.volume.chartTitleHour : t.volume.chartTitle}
                  categories={volume.map((v) => bucketLabel(v.bucket))}
                  unit=""
                  series={[
                    {
                      key: "incoming",
                      label: t.volume.seriesIncoming,
                      tone: "info",
                      values: volume.map((v) => v.incoming),
                    },
                    {
                      key: "outgoing",
                      label: t.volume.seriesOutgoing,
                      tone: "primary",
                      values: volume.map((v) => v.outgoing),
                    },
                  ]}
                />

                {/* Bảng số liệu — cách đọc chính xác từng bucket (đồng thời là
                    "bảng số liệu thay thế" của biểu đồ). Bảng chỉ ≥640px (§11). */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isHour ? t.volume.thHour : t.volume.thDay}</TableHead>
                        <TableHead className="text-right">{t.volume.thIncoming}</TableHead>
                        <TableHead className="text-right">{t.volume.thOutgoing}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {volume.map((v) => (
                        <TableRow key={v.bucket}>
                          <TableCell className="font-medium">{v.bucket}</TableCell>
                          <TableCell className="text-right tabular text-info">
                            {formatNumber(v.incoming, dl)}
                          </TableCell>
                          <TableCell className="text-right tabular text-primary">
                            {formatNumber(v.outgoing, dl)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Dưới 640px: xếp chồng thay cho bảng (§16) */}
                <ul className="divide-y divide-border rounded-lg border border-border sm:hidden">
                  {volume.map((v) => (
                    <li key={v.bucket} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="t-label tabular">{v.bucket}</span>
                      <span className="flex items-center gap-3 text-2xs tabular">
                        <span className="text-info">
                          {t.volume.listInto} {formatNumber(v.incoming, dl)}
                        </span>
                        <span className="text-primary">
                          {t.volume.listOut} {formatNumber(v.outgoing, dl)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* Nhóm R — số khách riêng biệt theo bucket (getCustomersPerBucket).
          Đặt ngay dưới lượng tin: "nhiều tin" không nhất thiết là "nhiều khách". */}
      <Section
        titleId="volume-customers-bucket"
        title={isHour ? t.volume.bucketTitleHour : t.volume.bucketTitle}
        description={t.volume.bucketDesc}
      >
        <Card>
          <CardContent>
            {customersPerBucket.length === 0 ? (
              <p className="t-meta" role="status">
                {t.volume.bucketEmpty}
              </p>
            ) : (
              <TrendChart
                title={t.volume.bucketChartTitle}
                description={t.volume.bucketChartDesc}
                categories={customersPerBucket.map((v) => bucketLabel(v.bucket))}
                series={[
                  {
                    key: "customers",
                    label: t.volume.bucketSeries,
                    tone: "info",
                    values: customersPerBucket.map((v) => v.incoming),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </Section>

      {/* Nhóm R — nguồn tin trả lời theo ngày (getConversationVolumeTrend).
          data-api: `otherOutgoing` KHÔNG được gọi là "nhân viên" -> nhãn "khác". */}
      <Section
        titleId="volume-ai-share"
        title={t.volume.aiTrendTitle}
        description={
          aiShare != null
            ? fmt(t.volume.aiTrendSummary, { pct: aiShare })
            : t.volume.aiTrendSummaryNone
        }
      >
        <Card>
          <CardContent>
            {replyTrend.length === 0 ? (
              <p className="t-meta" role="status">
                {t.volume.aiTrendEmpty}
              </p>
            ) : (
              <TrendChart
                title={t.volume.aiTrendChartTitle}
                description={t.volume.aiTrendChartDesc}
                categories={replyDays.map((d) => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`)}
                series={[
                  {
                    key: "aiReplies",
                    label: t.volume.seriesAi,
                    tone: "success",
                    values: replyDays.map((d) => d.aiReplies),
                  },
                  {
                    key: "otherOutgoing",
                    label: t.volume.seriesOther,
                    tone: "warning",
                    values: replyDays.map((d) => d.otherOutgoing),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </Section>

      <Section
        titleId="volume-heatmap"
        title={t.volume.heatmapSectionTitle}
        description={t.volume.heatmapSectionDesc}
      >
        <Card>
          <CardContent>
            <Heatmap
              cells={heatmap}
              title={t.volume.heatmapTitle}
              description={t.volume.heatmapDesc}
            />
          </CardContent>
        </Card>
      </Section>

      <Section
        titleId="volume-top-customers"
        title={t.volume.topTitle}
        description={t.volume.topDesc}
      >
        <Card>
          {topCustomers.length === 0 ? (
            <CardContent>
              <p className="t-meta" role="status">
                {t.volume.topEmpty}
              </p>
            </CardContent>
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.volume.thCustomer}</TableHead>
                      <TableHead className="text-right">{t.volume.thCount}</TableHead>
                      <TableHead className="text-right">{t.volume.thLastMessage}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((c) => (
                      <TableRow key={c.senderId}>
                        <TableCell>
                          <span className="t-label">{c.senderName || c.senderId}</span>
                          {c.isNew ? (
                            <Badge variant="success" className="ml-2 align-middle">
                              {t.volume.badgeNew}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatNumber(c.msgCount, dl)}
                        </TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">
                          <span title={lastMessageTitle(c.lastTs)}>
                            {fmtLastMessage(c.lastTs)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Dưới 640px: xếp chồng (§16) */}
              <ul className="divide-y divide-border rounded-lg border border-border sm:hidden">
                {topCustomers.map((c) => (
                  <li key={c.senderId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="t-label block truncate">{c.senderName || c.senderId}</span>
                      <span className="t-meta block truncate" title={lastMessageTitle(c.lastTs)}>
                        {fmtLastMessage(c.lastTs)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {c.isNew ? <Badge variant="success">{t.volume.badgeNewShort}</Badge> : null}
                      <span className="text-2xs tabular">
                        {fmt(t.volume.countUnit, { n: formatNumber(c.msgCount, dl) })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </Section>
    </div>
  );
}
