import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export const revalidate = 15;

/** Nhãn + tone cho mức độ quan tâm — mỗi màu một nghĩa (§4). */
const INTEREST: Record<string, { label: string; variant: "priority" | "info" | "success" | "default" }> = {
  purchase_intent: { label: "Ý định mua", variant: "priority" },
  considering: { label: "Đang cân nhắc", variant: "info" },
  new: { label: "Mới quan tâm", variant: "success" },
};

export default async function CustomersPage() {
  const DAY = 86_400_000;
  const now = Date.now();

  const [customers, summary] = await Promise.all([
    rpc("getCustomersWithInterest", { limit: 50 }),
    rpc("getCustomerSummary", now - 7 * DAY),
  ]);

  const interestOf = (status: string) =>
    INTEREST[status] ?? { label: "Không hoạt động", variant: "default" as const };

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Quản lý Khách hàng"
        title="Danh sách khách hàng & Mức độ quan tâm"
        description="50 khách hoạt động gần nhất trong 7 ngày qua"
      />

      {/* KPI: một khung hairline thay vì 3 Card rời (§11) */}
      <MetricGrid className="sm:grid-cols-3" aria-label="Tổng hợp khách hàng trong kỳ">
        <Metric label="Tổng khách trong kỳ" value={summary.totalCustomers.toLocaleString()} />
        <Metric
          label="Khách hàng mới"
          value={summary.newCustomers.toLocaleString()}
          valueClassName="text-success"
          meta="Lần đầu nhắn trong kỳ"
        />
        <Metric
          label="Khách quay lại"
          value={summary.returningCustomers.toLocaleString()}
          valueClassName="text-info"
          meta="Đã từng nhắn trước đây"
        />
      </MetricGrid>

      {customers.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border bg-card p-10 text-center"
          role="status"
        >
          <p className="t-label">Chưa có khách hàng nào trong kỳ</p>
          <p className="t-meta mx-auto mt-1 max-w-[42ch]">
            Khi khách nhắn tin Messenger, hồ sơ sẽ tự động được tạo tại đây.
          </p>
        </div>
      ) : (
        <>
          {/* Bảng chỉ từ ≥640px (§11) */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-xs sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên / ID Khách</TableHead>
                  <TableHead>Sản phẩm quan tâm</TableHead>
                  <TableHead>Mức độ quan tâm</TableHead>
                  <TableHead className="hidden lg:table-cell">Lý do ghi nhận</TableHead>
                  <TableHead className="text-right">Lần cuối nhắn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const interest = interestOf(c.interest.status);
                  return (
                    <TableRow key={c.customerId}>
                      <TableCell>
                        <Link
                          href={`/customers/${c.customerId}`}
                          className="t-label rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {c.customerName || c.customerId}
                        </Link>
                      </TableCell>
                      <TableCell className="t-meta text-foreground">
                        {c.primaryProductName || "Chưa xác định"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={interest.variant}>{interest.label}</Badge>
                      </TableCell>
                      <TableCell className="t-meta hidden lg:table-cell">
                        {c.interest.reasons.join(" · ")}
                      </TableCell>
                      <TableCell className="t-meta text-right tabular">
                        {formatDateTime(c.lastInteractionMs)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Dưới 640px: danh sách xếp chồng (§16) */}
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-xs sm:hidden">
            {customers.map((c) => {
              const interest = interestOf(c.interest.status);
              return (
                <li key={c.customerId}>
                  <Link
                    href={`/customers/${c.customerId}`}
                    className="block min-h-14 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="t-label min-w-0 truncate">
                        {c.customerName || c.customerId}
                      </span>
                      <Badge variant={interest.variant}>{interest.label}</Badge>
                    </span>
                    <span className="t-meta mt-0.5 block truncate text-foreground">
                      {c.primaryProductName || "Chưa xác định sản phẩm"}
                    </span>
                    {c.interest.reasons.length > 0 ? (
                      <span className="t-meta block truncate">{c.interest.reasons.join(" · ")}</span>
                    ) : null}
                    <span className="mt-1 block text-2xs tabular text-muted-foreground">
                      Lần cuối: {formatDateTime(c.lastInteractionMs)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
