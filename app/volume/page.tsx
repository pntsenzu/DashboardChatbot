import React from "react";
import { rpc } from "@/lib/senzu-api";
import { formatMs, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { Section, Card, CardContent } from "@/components/ui/card";
import { TrendChart } from "@/components/ui/trend-chart";
import { Heatmap } from "@/components/ui/heatmap";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const revalidate = 30;

export default async function VolumePage() {
  const DAY = 86_400_000;
  const now = Date.now();

  const [volume, latency, topCustomers, heatmap] = await Promise.all([
    rpc("getVolume", now - 7 * DAY, "day"),
    rpc("getResponseLatency", now - 7 * DAY),
    rpc("getTopCustomers", now - 7 * DAY, 10),
    rpc("getHeatmap", now - 7 * DAY),
  ]);

  // "YYYY-MM-DD" -> "DD/MM" cho trục X gọn hơn.
  const shortDate = (bucket: string) => bucket.slice(8, 10) + "/" + bucket.slice(5, 7);
  const categories = volume.map((v) => shortDate(v.bucket));

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Phân tích hiệu suất"
        title="Lưu lượng tin nhắn & Độ trễ phản hồi"
        description="7 ngày gần nhất · giờ Việt Nam (UTC+7)"
      />

      {/* KPI độ trễ — một khung hairline, không tách mỗi con số ra một Card (§11) */}
      <MetricGrid className="sm:grid-cols-3" aria-label="Độ trễ phản hồi">
        <Metric
          label="Độ trễ trung bình"
          value={formatMs(latency.avgMs)}
          valueClassName={latency.avgMs == null ? "text-muted-foreground" : undefined}
          meta={
            latency.matchedCount > 0
              ? `${latency.matchedCount}/${latency.incomingCount} cặp tin khớp`
              : "Chưa đủ cặp tin để đo"
          }
        />
        <Metric
          label="Độ trễ trung vị (P50)"
          value={formatMs(latency.medianMs)}
          valueClassName="text-info"
          meta="50% số tin trả lời nhanh hơn mức này"
        />
        <Metric
          label="Độ trễ P90"
          value={formatMs(latency.p90Ms)}
          valueClassName={latency.p90Ms == null ? "text-muted-foreground" : "text-warning"}
          meta="10% số tin chậm hơn mức này"
        />
      </MetricGrid>

      <Section
        titleId="volume-trend"
        title="Lưu lượng tin nhắn theo ngày"
        description="Tin khách gửi vào so với tin bot/nhân viên gửi ra (UTC+7)"
      >
        <Card>
          <CardContent className="space-y-4">
            {volume.length === 0 ? (
              <p className="t-meta" role="status">
                Chưa có lưu lượng tin nhắn trong 7 ngày qua.
              </p>
            ) : (
              <>
                <TrendChart
                  title="Tin theo ngày"
                  categories={categories}
                  unit=""
                  series={[
                    {
                      key: "incoming",
                      label: "Tin vào (khách)",
                      tone: "info",
                      values: volume.map((v) => v.incoming),
                    },
                    {
                      key: "outgoing",
                      label: "Tin ra (bot / nhân viên)",
                      tone: "primary",
                      values: volume.map((v) => v.outgoing),
                    },
                  ]}
                />

                {/* Bảng số liệu — cách đọc chính xác từng ngày (đồng thời là "bảng số liệu thay thế" của biểu đồ). */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead className="text-right">Tin vào (khách)</TableHead>
                        <TableHead className="text-right">Tin ra (bot / NV)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {volume.map((v) => (
                        <TableRow key={v.bucket}>
                          <TableCell className="font-medium">{v.bucket}</TableCell>
                          <TableCell className="text-right tabular text-info">
                            {v.incoming.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular text-primary">
                            {v.outgoing.toLocaleString()}
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
                        <span className="text-info">vào {v.incoming.toLocaleString()}</span>
                        <span className="text-primary">ra {v.outgoing.toLocaleString()}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section
        titleId="volume-heatmap"
        title="Giờ cao điểm (thứ × giờ)"
        description="Số tin khách gửi theo khung giờ trong 7 ngày qua"
      >
        <Card>
          <CardContent>
            <Heatmap
              cells={heatmap}
              title="Ma trận thứ × giờ"
              description="Ô càng đậm càng nhiều tin; rê chuột lên ô để xem số chính xác"
            />
          </CardContent>
        </Card>
      </Section>

      <Section
        titleId="volume-top-customers"
        title="Khách hàng nhắn tin nhiều nhất"
        description="Tính theo tổng số tin trong 7 ngày qua"
      >
        <Card>
          {topCustomers.length === 0 ? (
            <CardContent>
              <p className="t-meta" role="status">
                Chưa có dữ liệu khách hàng trong kỳ.
              </p>
            </CardContent>
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead className="text-right">Số tin</TableHead>
                      <TableHead className="text-right">Tin nhắn cuối</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((c) => (
                      <TableRow key={c.senderId}>
                        <TableCell>
                          <span className="t-label">{c.senderName || c.senderId}</span>
                          {c.isNew ? (
                            <Badge variant="success" className="ml-2 align-middle">
                              Khách mới
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {c.msgCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">
                          {formatDateTime(c.lastTs)}
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
                      <span className="t-meta block truncate">{formatDateTime(c.lastTs)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {c.isNew ? <Badge variant="success">Mới</Badge> : null}
                      <span className="text-2xs tabular">{c.msgCount.toLocaleString()} tin</span>
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
