import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { resolveRange, toISODateVN } from "@/lib/date-range";
import { getTopCustomersInRange, needsEndBound } from "@/lib/range-aggregates";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Section, Card, CardContent } from "@/components/ui/card";
import { TrendChart } from "@/components/ui/trend-chart";
import { Tabs, Tab } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/state";
import { DateRangeFilter } from "@/components/date-range-filter";

// Tab (view) nằm trên URL ?tab= -> dynamic (cookie locale + query).
export const dynamic = "force-dynamic";

/** Số khách tối đa của danh bạ toàn cục (data-api §9: limit 20–200). */
const DIRECTORY_LIMIT = 200;

/** Số khách tối đa của bảng "trong kỳ" (getTopCustomersInRange). */
const TABLE_LIMIT = 50;

/** Số dòng mức độ quan tâm tải về để join vào bảng trong kỳ (data-api §9: 20–200). */
const INTEREST_JOIN_LIMIT = 200;

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

type Severity = "info" | "warning" | "error";

const SEVERITY_RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

const SEVERITY_BADGE: Record<Severity, "destructive" | "warning" | "info"> = {
  error: "destructive",
  warning: "warning",
  info: "info",
};

interface SearchParams {
  tab?: string;
  /** Kỳ hiển thị — cùng bộ preset với /volume và /products (resolveRange). */
  range?: string;
  from?: string;
  to?: string;
}

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const now = Date.now();
  const t = getDict();
  const dl = t.dateLocale;

  // Kỳ của tab "Hoạt động trong kỳ" lấy trên URL (?range=&from=&to=); mặc định 7 ngày
  // như trước đây. Danh bạ toàn cục (tab "all") vẫn không bị lọc theo ngày.
  const range = resolveRange(searchParams, now);
  const { sinceMs, untilMs, preset } = range;
  const showAll = searchParams?.tab === "all";

  /** Ngày theo giờ VN, vd "01/10/2026" — dùng cho mô tả kỳ trên PageHeader. */
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString(dl, {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // 2 hàm nhóm R dùng cho cả hai tab: tổng khách tích luỹ (đối chiếu "trong kỳ")
  // và sự kiện CHƯA giải quyết (badge cảnh báo trên từng dòng khách).
  const [lifetimeCustomers, openAttention] = await Promise.all([
    rpc("getTotalCustomersLifetime"),
    rpc("getOpenAttentionItems", 100),
  ]);

  // Gộp sự kiện theo khách: đủ số lượng + mức nghiêm trọng cao nhất.
  // Một lần gọi duy nhất thay vì N call `getCustomerOpenAttention` cho N dòng.
  const attentionByCustomer = new Map<string, { count: number; severity: Severity }>();
  for (const item of openAttention) {
    if (!item.customerId) continue;
    const hit = attentionByCustomer.get(item.customerId);
    if (!hit) {
      attentionByCustomer.set(item.customerId, { count: 1, severity: item.severity });
    } else {
      hit.count += 1;
      if (SEVERITY_RANK[item.severity] > SEVERITY_RANK[hit.severity]) hit.severity = item.severity;
    }
  }

  const attentionBadgeOf = (customerId: string) => {
    const hit = attentionByCustomer.get(customerId);
    if (!hit) return null;
    return (
      <Badge variant={SEVERITY_BADGE[hit.severity]}>
        {fmt(t.customers.attentionBadge, { n: hit.count })}
      </Badge>
    );
  };

  /**
   * Chuỗi truy vấn kỳ (KHÔNG có "?") — đính kèm vào cả hai tab để kỳ đang chọn
   * không bị mất khi chuyển qua lại (URL là nguồn sự thật — Back/Forward, refresh
   * và copy link đều đúng kỳ). Tab danh bạ vẫn không LỌC theo ngày, chỉ giữ kỳ.
   */
  const rangeQuery =
    preset === "custom" && searchParams.from && searchParams.to
      ? `range=custom&from=${searchParams.from}&to=${searchParams.to}`
      : preset === "last7"
        ? ""
        : `range=${preset}`;

  const isPeriodTab = !showAll;
  const tabs = (
    <Tabs label={t.customers.tabsLabel}>
      <Tab href={`/customers${rangeQuery ? `?${rangeQuery}` : ""}`} active={isPeriodTab}>
        {t.customers.tabPeriod}
      </Tab>
      <Tab href={`/customers?tab=all${rangeQuery ? `&${rangeQuery}` : ""}`} active={showAll}>
        {t.customers.tabAll}
      </Tab>
    </Tabs>
  );

  // ---------------------------------------------------------------- tab: toàn bộ
  // Danh bạ KHÔNG bị bộ lọc 7 ngày chặn — xem được cả khách đã im lặng lâu ngày.
  if (showAll) {
    const directory = await rpc("getAllCustomers", DIRECTORY_LIMIT);

    return (
      <div className="space-y-4">
        <PageHeader
          overline={t.customers.overline}
          title={t.customers.title}
          description={fmt(t.customers.directoryDesc, {
            n: formatNumber(DIRECTORY_LIMIT, dl),
          })}
        />
        {tabs}

        <Section
          titleId="customer-directory"
          title={t.customers.directoryTitle}
        >
          <Card>
            {directory.length === 0 ? (
              <CardContent>
                <EmptyState
                  title={t.customers.directoryEmptyTitle}
                  description={t.customers.directoryEmptyDesc}
                />
              </CardContent>
            ) : (
              <>
                {/* Bảng chỉ ≥640px (§11) */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.customers.thCustomer}</TableHead>
                        <TableHead className="text-right">{t.customers.thMessages}</TableHead>
                        <TableHead className="hidden text-right lg:table-cell">
                          {t.customers.thConversations}
                        </TableHead>
                        <TableHead className="text-right">{t.customers.thLastSeen}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {directory.map((c) => (
                        <TableRow key={c.customerId}>
                          <TableCell>
                            <span className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/customers/${c.customerId}`}
                                className="t-label rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {c.customerName || c.customerId}
                              </Link>
                              {attentionBadgeOf(c.customerId)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular">
                            {formatNumber(c.totalMessages, dl)}
                          </TableCell>
                          <TableCell className="hidden text-right tabular lg:table-cell">
                            {formatNumber(c.totalConversations, dl)}
                          </TableCell>
                          <TableCell className="text-right tabular text-muted-foreground">
                            {formatDateTime(c.lastInteractionMs, dl)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Dưới 640px: xếp chồng (§16) */}
                <ul className="divide-y divide-border sm:hidden">
                  {directory.map((c) => (
                    <li key={c.customerId}>
                      <Link
                        href={`/customers/${c.customerId}`}
                        className="block min-h-14 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="t-label min-w-0 truncate">
                            {c.customerName || c.customerId}
                          </span>
                          {attentionBadgeOf(c.customerId)}
                        </span>
                        <span className="t-meta block">
                          {fmt(t.customers.countMessages, {
                            n: formatNumber(c.totalMessages, dl),
                          })}{" "}
                          · {fmt(t.customers.countConversations, {
                            n: formatNumber(c.totalConversations, dl),
                          })}
                        </span>
                        <span className="mt-0.5 block text-2xs tabular text-muted-foreground">
                          {t.customers.lastSeenPrefix} {formatDateTime(c.lastInteractionMs, dl)}
                        </span>
                      </Link>
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

  // -------------------------------------------------------- tab: trong kỳ đã chọn
  // Kỳ đã kết thúc (Hôm qua / Tháng trước / tùy chọn quá khứ): API chỉ nhận
  // `sinceMs` sẽ còn cộng dồn cả phần SAU kỳ -> cần bù giới hạn kết thúc (DEF-07).
  const bounded = needsEndBound(untilMs, now);

  const [topCustomers, interestRows, periodStats, activityStats, activityTrend] =
    await Promise.all([
      // Tập khách CÓ TIN trong kỳ — đúng khung [since, until). `getCustomersWithInterest`
      // KHÔNG lọc theo thời gian nên chỉ dùng để join mức độ quan tâm (DEF-04).
      getTopCustomersInRange(sinceMs, untilMs, TABLE_LIMIT, bounded),
      rpc("getCustomersWithInterest", { limit: INTEREST_JOIN_LIMIT }),
      // KPI "trong kỳ" phải đóng khung [since, until): `getCustomerSummary` chỉ có
      // tham số since -> với kỳ ĐÃ kết thúc nó còn đếm cả phần nằm sau kỳ. Dùng
      // getPeriodStats (đúng khung) + cộng dồn "khách mới" từ trend (mỗi khách
      // chỉ "mới" đúng một ngày nên cộng dồn không tính trùng).
      rpc("getPeriodStats", sinceMs, untilMs),
      // Nhóm R: 2 hàm đã có nhưng chưa trang nào dùng.
      rpc("getCustomerActivityStats", sinceMs, untilMs),
      rpc("getCustomerActivityTrend", sinceMs, untilMs),
    ]);

  const totalInPeriod = periodStats.distinctCustomers;
  const newInPeriod = activityTrend.reduce((sum, d) => sum + d.newCustomers, 0);
  // Khách hoạt động trong kỳ = khách mới (lần đầu nhắn trong kỳ) + khách đã từng nhắn trước đây.
  const returningInPeriod = Math.max(0, totalInPeriod - newInPeriod);

  // Bảng = chính tập khách có tin trong kỳ (cùng định nghĩa với KPI "Tổng khách
  // trong kỳ" -> số dòng khớp KPI), join thêm mức độ quan tâm theo customerId.
  // Không có dữ liệu quan tâm -> hiển thị "Chưa xác định", KHÔNG loại khách đi.
  const interestByCustomer = new Map(interestRows.map((row) => [row.customerId, row]));
  const customers = topCustomers
    .map((row) => {
      const hit = interestByCustomer.get(row.senderId);
      return {
        customerId: row.senderId,
        name: row.senderName || hit?.customerName || row.senderId,
        /** Tin cuối TRONG kỳ — `null` nghĩa là không xác định được (hiện "—"). */
        lastTs: row.lastTs,
        product: hit?.primaryProductName ?? null,
        interest: hit?.interest ?? null,
      };
    })
    // Sắp theo tin cuối trong kỳ (mới nhất trước); không có mốc -> cuối danh sách.
    .sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));

  const interestOf = (status: string) =>
    INTEREST[status] ?? { key: "inactive" as const, variant: "default" as const };

  return (
    <div className="space-y-4">
      <PageHeader
        overline={t.customers.overline}
        title={t.customers.title}
        description={fmt(t.customers.description, {
          from: fmtDate(sinceMs),
          to: fmtDate(untilMs - 1),
        })}
      />
      {tabs}

      {/* Bộ lọc ngày — trạng thái nằm trên URL (?range=&from=&to=), chỉ áp cho
          tab đang xem; tab danh bạ toàn cục cố ý không lọc theo ngày. */}
      <DateRangeFilter
        preset={preset}
        from={preset === "custom" ? (searchParams.from ?? "") : toISODateVN(sinceMs)}
        to={
          preset === "custom"
            ? (searchParams.to ?? toISODateVN(untilMs - 1))
            : toISODateVN(untilMs - 1)
        }
        basePath="/customers"
      />
      {range.fallback ? (
        <p className="t-meta text-warning" role="status">
          {t.range.invalid}
        </p>
      ) : null}

      {/* KPI: một khung hairline thay vì 3 Card rời (§11) */}
      <MetricGrid className="sm:grid-cols-3" aria-label={t.customers.kpiGridAria}>
        <Metric label={t.customers.kpiTotal} value={formatNumber(totalInPeriod, dl)} />
        <Metric
          label={t.customers.kpiNew}
          value={formatNumber(newInPeriod, dl)}
          valueClassName="text-success"
          meta={t.customers.kpiNewMeta}
        />
        <Metric
          label={t.customers.kpiReturning}
          value={formatNumber(returningInPeriod, dl)}
          valueClassName="text-info"
          meta={t.customers.kpiReturningMeta}
        />
      </MetricGrid>

      {/* Nhóm R — tín hiệu quan tâm + tổng khách tích luỹ (đối chiếu "trong kỳ") */}
      <Section
        titleId="customer-signals"
        title={t.customers.signalsTitle}
        description={t.customers.signalsDesc}
      >
        <MetricGrid className="sm:grid-cols-3" aria-label={t.customers.signalsTitle}>
          <Metric
            label={t.customers.kpiLifetime}
            value={formatNumber(lifetimeCustomers, dl)}
            meta={t.customers.kpiLifetimeMeta}
          />
          <Metric
            label={t.customers.kpiInterest}
            value={formatNumber(activityStats.customersWithProductInterest, dl)}
            valueClassName="text-info"
            meta={t.customers.kpiInterestMeta}
          />
          <Metric
            label={t.customers.kpiPurchase}
            value={formatNumber(activityStats.customersWithPurchaseSignal, dl)}
            valueClassName="text-priority"
            meta={t.customers.kpiPurchaseMeta}
          />
        </MetricGrid>
      </Section>

      {/* Nhóm R — khách hoạt động theo ngày (getCustomerActivityTrend) */}
      <Section
        titleId="customer-activity"
        title={t.customers.activityTitle}
        description={t.customers.activityDesc}
      >
        <Card>
          <CardContent>
            {activityTrend.length === 0 ? (
              <p className="t-meta" role="status">
                {t.customers.activityEmpty}
              </p>
            ) : (
              <TrendChart
                title={t.customers.activityChartTitle}
                categories={activityTrend.map(
                  (d) => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`
                )}
                series={[
                  {
                    key: "newCustomers",
                    label: t.customers.seriesNew,
                    tone: "success",
                    values: activityTrend.map((d) => d.newCustomers),
                  },
                  {
                    key: "returningCustomers",
                    label: t.customers.seriesReturning,
                    tone: "info",
                    values: activityTrend.map((d) => d.returningCustomers),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </Section>

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
                  const interest = c.interest ? interestOf(c.interest.status) : null;
                  return (
                    <TableRow key={c.customerId}>
                      <TableCell>
                        <span className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/customers/${c.customerId}`}
                            className="t-label rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {c.name}
                          </Link>
                          {attentionBadgeOf(c.customerId)}
                        </span>
                      </TableCell>
                      <TableCell className="t-meta text-foreground">
                        {c.product || t.customers.unknown}
                      </TableCell>
                      <TableCell>
                        <Badge variant={interest?.variant ?? "default"}>
                          {interest ? t.customers.interest[interest.key] : t.customers.unknown}
                        </Badge>
                      </TableCell>
                      <TableCell className="t-meta hidden lg:table-cell">
                        {c.interest && c.interest.reasons.length > 0
                          ? c.interest.reasons.join(" · ")
                          : t.customers.unknown}
                      </TableCell>
                      <TableCell
                        className="t-meta text-right tabular"
                        title={c.lastTs == null ? t.customers.lastMessageUnknown : undefined}
                      >
                        {c.lastTs == null ? "—" : formatDateTime(c.lastTs, dl)}
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
              const interest = c.interest ? interestOf(c.interest.status) : null;
              return (
                <li key={c.customerId}>
                  <Link
                    href={`/customers/${c.customerId}`}
                    className="block min-h-14 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="t-label min-w-0 truncate">{c.name}</span>
                      <span className="flex items-center gap-2">
                        {attentionBadgeOf(c.customerId)}
                        <Badge variant={interest?.variant ?? "default"}>
                          {interest ? t.customers.interest[interest.key] : t.customers.unknown}
                        </Badge>
                      </span>
                    </span>
                    <span className="t-meta mt-0.5 block truncate text-foreground">
                      {c.product || t.customers.unknownProduct}
                    </span>
                    {c.interest && c.interest.reasons.length > 0 ? (
                      <span className="t-meta block truncate">{c.interest.reasons.join(" · ")}</span>
                    ) : null}
                    <span className="mt-1 block text-2xs tabular text-muted-foreground">
                      {t.customers.lastSeenPrefix}{" "}
                      {c.lastTs == null ? "—" : formatDateTime(c.lastTs, dl)}
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
