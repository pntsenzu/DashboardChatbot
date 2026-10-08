import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { getDict } from "@/lib/i18n-server";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export const revalidate = 15;

/** Tiêu đề tab theo ngôn ngữ hiện tại (định dạng "%s · Senzu Chatbot Dashboard"). */
export function generateMetadata() {
  return { title: getDict().customers.title };
}

/** Khóa dịch cho mức độ quan tâm — mỗi màu một nghĩa (§4). */
const INTEREST: Record<
  string,
  { key: "purchase_intent" | "considering" | "new" | "inactive"; variant: "priority" | "info" | "success" | "default" }
> = {
  purchase_intent: { key: "purchase_intent", variant: "priority" },
  considering: { key: "considering", variant: "info" },
  new: { key: "new", variant: "success" },
};

export default async function CustomersPage() {
  const DAY = 86_400_000;
  const now = Date.now();
  const t = getDict();
  const dl = t.dateLocale;

  const periodStart = now - 7 * DAY;
  const [allCustomers, summary] = await Promise.all([
    rpc("getCustomersWithInterest", { limit: 50 }),
    rpc("getCustomerSummary", periodStart),
  ]);

  // Bảng và KPI phải cùng một kỳ: API danh sách khách KHÔNG lọc theo thời gian,
  // nên tự lọc theo lần tương tác gần nhất trong 7 ngày (DEF-04) — khớp caption
  // "…trong 7 ngày qua" và KPI "Tổng khách trong kỳ".
  const customers = allCustomers.filter((c) => c.lastInteractionMs >= periodStart);

  const interestOf = (status: string) =>
    INTEREST[status] ?? { key: "inactive" as const, variant: "default" as const };

  return (
    <div className="space-y-4">
      <PageHeader
        overline={t.customers.overline}
        title={t.customers.title}
        description={t.customers.description}
      />

      {/* KPI: một khung hairline thay vì 3 Card rời (§11) */}
      <MetricGrid className="sm:grid-cols-3" aria-label={t.customers.kpiGridAria}>
        <Metric label={t.customers.kpiTotal} value={formatNumber(summary.totalCustomers, dl)} />
        <Metric
          label={t.customers.kpiNew}
          value={formatNumber(summary.newCustomers, dl)}
          valueClassName="text-success"
          meta={t.customers.kpiNewMeta}
        />
        <Metric
          label={t.customers.kpiReturning}
          value={formatNumber(summary.returningCustomers, dl)}
          valueClassName="text-info"
          meta={t.customers.kpiReturningMeta}
        />
      </MetricGrid>

      {customers.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border bg-card p-10 text-center"
          role="status"
        >
          <p className="t-label">{t.customers.emptyTitle}</p>
          <p className="t-meta mx-auto mt-1 max-w-[42ch]">{t.customers.emptyDesc}</p>
        </div>
      ) : (
        <>
          {/* Bảng chỉ từ ≥640px (§11) */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-xs sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.customers.thCustomer}</TableHead>
                  <TableHead>{t.customers.thProduct}</TableHead>
                  <TableHead>{t.customers.thInterest}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t.customers.thReason}</TableHead>
                  <TableHead className="text-right">{t.customers.thLastSeen}</TableHead>
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
                        {c.primaryProductName || t.customers.unknown}
                      </TableCell>
                      <TableCell>
                        <Badge variant={interest.variant}>{t.customers.interest[interest.key]}</Badge>
                      </TableCell>
                      <TableCell className="t-meta hidden lg:table-cell">
                        {c.interest.reasons.join(" · ")}
                      </TableCell>
                      <TableCell className="t-meta text-right tabular">
                        {formatDateTime(c.lastInteractionMs, dl)}
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
                      <Badge variant={interest.variant}>{t.customers.interest[interest.key]}</Badge>
                    </span>
                    <span className="t-meta mt-0.5 block truncate text-foreground">
                      {c.primaryProductName || t.customers.unknownProduct}
                    </span>
                    {c.interest.reasons.length > 0 ? (
                      <span className="t-meta block truncate">{c.interest.reasons.join(" · ")}</span>
                    ) : null}
                    <span className="mt-1 block text-2xs tabular text-muted-foreground">
                      {t.customers.lastSeenPrefix} {formatDateTime(c.lastInteractionMs, dl)}
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
