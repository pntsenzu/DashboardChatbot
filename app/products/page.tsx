import React from "react";
import { rpc } from "@/lib/senzu-api";
import { TopProductRow, QuestionTypeCount, ProductMentionSummary, UnknownProductMention } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export const revalidate = 30;

export default async function ProductsPage() {
  const DAY = 86_400_000;
  const now = Date.now();

  const [topProducts, questionTypes, summary, unknownProducts] = await Promise.all([
    rpc<TopProductRow[]>("getTopProducts", now - 7 * DAY, 10),
    rpc<QuestionTypeCount[]>("getProductQuestionBreakdown", now - 7 * DAY),
    rpc<ProductMentionSummary>("getProductMentionSummary", now - 7 * DAY),
    rpc<UnknownProductMention[]>("getUnknownProductMentions", now - 7 * DAY, 10),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="t-overline text-primary">Phân tích Sản phẩm</span>
          <h1 className="t-page">Sản phẩm & Tín hiệu hỏi hàng</h1>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Tổng lượt hỏi sản phẩm</div>
          <div className="t-metric tabular">{summary.total}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Khớp được Catalog</div>
          <div className="t-metric text-success tabular">{summary.resolved}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Tỉ lệ chưa xác định (Knowledge Gap)</div>
          <div className="t-metric text-warning tabular">
            {summary.unresolvedRate != null ? `${(summary.unresolvedRate * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Top Products & Question Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
          <h3 className="t-card">Top sản phẩm được hỏi nhiều nhất</h3>
          <div className="space-y-2">
            {topProducts.map((p) => (
              <div key={p.productId} className="p-3 rounded border border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <div className="t-label font-semibold">{p.productName || p.productId}</div>
                  <div className="t-meta">{p.uniqueCustomers} khách hàng quan tâm</div>
                </div>
                <div className="t-metric text-base font-bold tabular">{p.mentionCount} lượt</div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Type Breakdown */}
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
          <h3 className="t-card">Phân bổ loại câu hỏi</h3>
          <div className="space-y-2">
            {questionTypes.map((q) => (
              <div key={q.questionType} className="p-3 rounded border border-border bg-card flex items-center justify-between">
                <div>
                  <Badge variant={q.questionType === "ORDER" ? "priority" : q.questionType === "PRICE" ? "info" : "default"}>
                    {q.questionType}
                  </Badge>
                  <span className="t-meta ml-2">{q.uniqueCustomers} khách hàng</span>
                </div>
                <div className="font-semibold tabular">{q.count} câu hỏi</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unknown Products (Missing Catalog Gaps) */}
      <div className="p-4 rounded-lg border border-warning-border bg-warning-subtle space-y-3">
        <h3 className="t-card text-warning">Sản phẩm khách hỏi nhưng CHƯA CÓ trong Catalog</h3>
        <div className="space-y-2">
          {unknownProducts.map((u, i) => (
            <div key={i} className="p-3 rounded border border-warning-border/60 bg-card flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm capitalize">{u.normalizedName}</span>
                <span className="text-xs font-bold text-warning tabular">{u.count} lượt nhắc</span>
              </div>
              <p className="t-meta italic">Ví dụ tin nhắn: &ldquo;{u.example}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
