import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const revalidate = 15;

export default async function CustomersPage() {
  const DAY = 86_400_000;
  const now = Date.now();

  const [customers, summary] = await Promise.all([
    rpc("getCustomersWithInterest", { limit: 50 }),
    rpc("getCustomerSummary", now - 7 * DAY),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="t-overline text-primary">Quản lý Khách hàng</span>
          <h1 className="t-page">Danh sách khách hàng & Mức độ quan tâm</h1>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Tổng khách trong kỳ</div>
          <div className="t-metric tabular">{summary.totalCustomers}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Khách hàng mới</div>
          <div className="t-metric text-success tabular">{summary.newCustomers}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Khách quay lại</div>
          <div className="t-metric text-info tabular">{summary.returningCustomers}</div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-10 text-center space-y-2" role="status">
            <p className="t-label">Chưa có khách hàng nào trong kỳ</p>
            <p className="t-meta">Khi khách nhắn tin Messenger, hồ sơ sẽ tự động được tạo tại đây.</p>
          </div>
        ) : (
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-xs uppercase t-overline">
              <th className="p-3">Tên / ID Khách</th>
              <th className="p-3">Sản phẩm quan tâm</th>
              <th className="p-3">Mức độ quan tâm</th>
              <th className="p-3">Lý do ghi nhận</th>
              <th className="p-3 text-right">Lần cuối nhắn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((c) => (
              <tr key={c.customerId} className="hover:bg-muted/40 transition-colors">
                <td className="p-3 font-semibold">
                  <Link href={`/customers/${c.customerId}`} className="hover:text-primary">
                    {c.customerName || c.customerId}
                  </Link>
                </td>
                <td className="p-3">
                  <span className="t-meta text-foreground">{c.primaryProductName || "Chưa xác định"}</span>
                </td>
                <td className="p-3">
                  <Badge variant={c.interest.status === "purchase_intent" ? "priority" : c.interest.status === "considering" ? "info" : "default"}>
                    {c.interest.status === "purchase_intent" ? "Ý định mua" : c.interest.status === "considering" ? "Đang cân nhắc" : c.interest.status === "new" ? "Mới quan tâm" : "Không hoạt động"}
                  </Badge>
                </td>
                <td className="p-3 text-xs t-meta">
                  {c.interest.reasons.join(" · ")}
                </td>
                <td className="p-3 text-right tabular text-xs t-meta">
                  {formatDateTime(c.lastInteractionMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
