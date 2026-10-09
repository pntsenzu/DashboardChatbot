import React from "react";
import { rpc } from "@/lib/senzu-api";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fillDailyTrend, resolveRange, toISODateVN } from "@/lib/date-range";
import {
  getProductMentionSummaryInRange,
  getProductQuestionBreakdownInRange,
  getTopProductsInRange,
  getUnknownProductMentionsInRange,
  needsEndBound,
} from "@/lib/range-aggregates";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Section, Card, CardContent } from "@/components/ui/card";
import { TrendChart } from "@/components/ui/trend-chart";
import { DateRangeFilter } from "@/components/date-range-filter";

// Kỳ lấy số liệu nằm trên URL (?range=&from=&to=) -> dynamic.
export const dynamic = "force-dynamic";

/** Tiêu đề tab theo ngôn ngữ hiện tại (định dạng "%s · Senzu Chatbot Dashboard"). */
export function generateMetadata() {
  return { title: getDict().products.title };
}

interface SearchParams {
  range?: string;
  from?: string;
  to?: string;
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const now = Date.now();
  const t = getDict();
  const dl = t.dateLocale;

  // Mặc định 30 ngày: dữ liệu hỏi sản phẩm thưa nên 7 ngày thường trống.
  const range = resolveRange(searchParams, now, "last30");
  const { sinceMs, untilMs, preset } = range;

  // Kỳ đã kết thúc: 4 API sản phẩm chỉ nhận `sinceMs` -> bù bằng hiệu hai lần
  // gọi (`since` − `until`) để mọi số trên trang thuộc đúng kỳ đã chọn (DEF-08).
  const bounded = needsEndBound(untilMs, now);

  const [topProducts, questionTypes, summary, unknownProducts, interestTrend] =
    await Promise.all([
      getTopProductsInRange(sinceMs, untilMs, 10, bounded),
      getProductQuestionBreakdownInRange(sinceMs, untilMs, bounded),
      getProductMentionSummaryInRange(sinceMs, untilMs, bounded),
      getUnknownProductMentionsInRange(sinceMs, untilMs, 10, bounded),
      // Nhóm R: hàm đã có nhưng chưa trang nào dùng — lõi của phân tích sở thích.
      rpc("getInterestSignalsTrend", sinceMs, untilMs),
    ]);

  // API trả sparse (chỉ ngày có dữ liệu) -> bù ngày 0 để trục X đủ mọi ngày (DEF-14).
  const interestDays = fillDailyTrend(interestTrend, sinceMs, untilMs, {
    productMentions: 0,
    priceQuestions: 0,
    informationQuestions: 0,
    orderSignals: 0,
  });

  /** Ngày theo giờ VN, vd "01/10/2026". */
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString(dl, {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // Kỳ đã kết thúc: số liệu đã được bù về đúng kỳ — ghi rõ phần API không lọc được.
  const endedInPast = untilMs < now - 60_000;

  return (
    <div className="space-y-4">
      <PageHeader
        overline={t.products.overline}
        title={t.products.title}
        description={fmt(t.products.description, { from: fmtDate(sinceMs), to: fmtDate(untilMs - 1) })}
      />

      {/* Bộ lọc ngày — trạng thái nằm trên URL (?range=&from=&to=) */}
      <DateRangeFilter
        basePath="/products"
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
          {t.products.aggregateNote}
        </p>
      ) : null}

      {/* Summary KPI — một khung hairline (§11) */}
      <MetricGrid className="sm:grid-cols-3" aria-label={t.products.title}>
        <Metric label={t.products.kpiTotal} value={formatNumber(summary.total, dl)} />
        <Metric
          label={t.products.kpiResolved}
          value={formatNumber(summary.resolved, dl)}
          valueClassName="text-success"
        />
        <Metric
          label={t.products.kpiGap}
          value={
            summary.unresolvedRate != null
              ? `${(summary.unresolvedRate * 100).toFixed(1)}%`
              : "—"
          }
          valueClassName="text-warning"
        />
      </MetricGrid>

      {/* Nhóm R — tín hiệu quan tâm theo ngày (getInterestSignalsTrend):
          4 đường cho biết "khách chỉ dò giá" hay "khách muốn đặt hàng". */}
      <Section
        titleId="interest-trend"
        title={t.products.interestTrendTitle}
        description={t.products.interestTrendDesc}
      >
        <Card>
          <CardContent>
            {interestTrend.length === 0 ? (
              <p className="t-meta" role="status">
                {t.products.interestEmpty}
              </p>
            ) : (
              <TrendChart
                title={t.products.interestChartTitle}
                categories={interestDays.map(
                  (d) => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`
                )}
                series={[
                  {
                    key: "productMentions",
                    label: t.products.seriesMentions,
                    tone: "info",
                    values: interestDays.map((d) => d.productMentions),
                  },
                  {
                    key: "priceQuestions",
                    label: t.products.seriesPrice,
                    tone: "warning",
                    values: interestDays.map((d) => d.priceQuestions),
                  },
                  {
                    key: "informationQuestions",
                    label: t.products.seriesInfo,
                    tone: "success",
                    values: interestDays.map((d) => d.informationQuestions),
                  },
                  {
                    key: "orderSignals",
                    label: t.products.seriesOrder,
                    tone: "primary",
                    values: interestDays.map((d) => d.orderSignals),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </Section>

      {/* Top Products & Question Types */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section titleId="top-products" title={t.products.topTitle}>
          <Card>
            <CardContent className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="t-meta" role="status">
                  {t.products.topEmpty}
                </p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p) => (
                    <div
                      key={p.productId}
                      className="p-3 rounded border border-border bg-muted/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="t-label font-semibold">{p.productName || p.productId}</div>
                        <div className="t-meta">
                          {fmt(t.products.topCustomers, { n: p.uniqueCustomers })}
                        </div>
                      </div>
                      <div className="t-metric tabular">
                        {fmt(t.products.topMentions, { n: p.mentionCount })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Section>

        <Section titleId="question-types" title={t.products.questionTitle}>
          <Card>
            <CardContent className="space-y-3">
              {questionTypes.length === 0 ? (
                <p className="t-meta" role="status">
                  {t.products.questionEmpty}
                </p>
              ) : (
                <div className="space-y-2">
                  {questionTypes.map((q) => (
                    <div
                      key={q.questionType}
                      className="p-3 rounded border border-border bg-card flex items-center justify-between"
                    >
                      <div>
                        <Badge
                          variant={
                            q.questionType === "ORDER"
                              ? "priority"
                              : q.questionType === "PRICE"
                                ? "info"
                                : "default"
                          }
                        >
                          {q.questionType}
                        </Badge>
                        <span className="t-meta ml-2">
                          {fmt(t.products.questionCustomers, { n: q.uniqueCustomers })}
                        </span>
                      </div>
                      <div className="font-semibold tabular">
                        {fmt(t.products.questionCount, { n: q.count })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Section>
      </div>

      {/* Unknown Products (Missing Catalog Gaps) */}
      <div className="p-4 rounded-lg border border-warning-border bg-warning-subtle space-y-3">
        <h3 className="t-card text-warning">{t.products.gapTitle}</h3>
        {unknownProducts.length === 0 ? (
          <p className="t-meta text-warning/90" role="status">
            {t.products.gapEmpty}
          </p>
        ) : (
          <div className="space-y-2">
            {unknownProducts.map((u, i) => (
              <div
                key={i}
                className="p-3 rounded border border-warning-border/60 bg-card flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm capitalize">{u.normalizedName}</span>
                  <span className="t-meta font-semibold text-warning tabular">
                    {fmt(t.products.gapMentions, { n: u.count })}
                  </span>
                </div>
                <p className="t-meta italic">
                  {t.products.gapExample} &ldquo;{u.example}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
