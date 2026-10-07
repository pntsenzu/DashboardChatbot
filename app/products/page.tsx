import React from "react";
import { rpc } from "@/lib/senzu-api";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Section, Card, CardContent } from "@/components/ui/card";

export const revalidate = 30;

export default async function ProductsPage() {
  const DAY = 86_400_000;
  const now = Date.now();
  const t = getDict();
  const dl = t.dateLocale;

  const [topProducts, questionTypes, summary, unknownProducts] = await Promise.all([
    rpc("getTopProducts", now - 7 * DAY, 10),
    rpc("getProductQuestionBreakdown", now - 7 * DAY),
    rpc("getProductMentionSummary", now - 7 * DAY),
    rpc("getUnknownProductMentions", now - 7 * DAY, 10),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader overline={t.products.overline} title={t.products.title} />

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
