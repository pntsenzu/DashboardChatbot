import React from "react";
import { rpc } from "@/lib/senzu-api";
import { VolumePoint, LatencyStats, CustomerRow } from "@/lib/types";
import { formatMs } from "@/lib/utils";

export const revalidate = 30;

export default async function VolumePage() {
  const DAY = 86_400_000;
  const now = Date.now();

  const [volume, latency, topCustomers] = await Promise.all([
    rpc<VolumePoint[]>("getVolume", now - 7 * DAY, "day"),
    rpc<LatencyStats>("getResponseLatency", now - 7 * DAY),
    rpc<CustomerRow[]>("getTopCustomers", now - 7 * DAY, 10),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="t-overline text-primary">Phân tích hiệu suất</span>
          <h1 className="t-page">Lưu lượng tin nhắn & Độ trễ phản hồi</h1>
        </div>
      </div>

      {/* Latency Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Độ trễ Trung Bình (Avg)</div>
          <div className="t-metric tabular">{formatMs(latency.avgMs)}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Độ trễ Trung Vị (Median)</div>
          <div className="t-metric text-info tabular">{formatMs(latency.medianMs)}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Độ trễ P90</div>
          <div className="t-metric text-warning tabular">{formatMs(latency.p90Ms)}</div>
        </div>
      </div>

      {/* Volume Table */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
        <h3 className="t-card">Lưu lượng tin nhắn theo ngày (UTC+7)</h3>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-xs uppercase t-overline">
              <th className="p-3">Ngày</th>
              <th className="p-3 text-right">Tin vào (Khách)</th>
              <th className="p-3 text-right">Tin ra (Bot / NV)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {volume.map((v) => (
              <tr key={v.bucket} className="hover:bg-muted/40">
                <td className="p-3 font-semibold">{v.bucket}</td>
                <td className="p-3 text-right tabular text-success font-medium">{v.incoming}</td>
                <td className="p-3 text-right tabular text-primary font-medium">{v.outgoing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Active Customers */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
        <h3 className="t-card">Top khách hàng nhắn tin nhiều nhất</h3>
        <div className="space-y-2">
          {topCustomers.map((c) => (
            <div key={c.senderId} className="p-3 rounded border border-border bg-muted/30 flex items-center justify-between">
              <div>
                <span className="t-label font-semibold">{c.senderName || c.senderId}</span>
                {c.isNew && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-success-subtle text-success border border-success-border font-medium">Khách mới</span>}
              </div>
              <div className="t-meta tabular font-mono font-semibold">{c.msgCount} tin nhắn</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
