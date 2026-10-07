import React from "react";
import { rpc } from "@/lib/senzu-api";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Cpu, CheckCircle2, XCircle } from "lucide-react";

// Trạng thái bot là heartbeat -> KHÔNG cache (data-api §9).
export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const status = await rpc("getSystemStatus");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="t-overline text-primary">Hệ thống & Tri thức Bot</span>
          <h1 className="t-page">Trạng thái Bot Chatbot</h1>
        </div>
      </div>

      <div className="p-6 rounded-lg border border-border bg-card shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground grid place-items-center">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="t-section text-lg font-bold">Bot Messenger Heartbeat</h2>
            <p className="t-meta">Giám sát các tiến trình tự động hóa và đồng bộ dữ liệu</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded border border-border bg-muted/30 flex items-center justify-between">
            <span className="t-label">Chrome Process Running</span>
            {status.chromeRunning ? (
              <Badge variant="success"><CheckCircle2 className="w-3.5 h-3.5" /> Đang chạy</Badge>
            ) : (
              <Badge variant="destructive"><XCircle className="w-3.5 h-3.5" /> Tắt</Badge>
            )}
          </div>

          <div className="p-4 rounded border border-border bg-muted/30 flex items-center justify-between">
            <span className="t-label">Messenger Connected</span>
            {status.messengerConnected ? (
              <Badge variant="success"><CheckCircle2 className="w-3.5 h-3.5" /> Kết nối tốt</Badge>
            ) : (
              <Badge variant="destructive"><XCircle className="w-3.5 h-3.5" /> Mất kết nối</Badge>
            )}
          </div>

          <div className="p-4 rounded border border-border bg-muted/30 flex items-center justify-between">
            <span className="t-label">AI Provider / Model</span>
            <span className="font-semibold text-sm">{status.aiProvider || "Google Gemini"} ({status.aiModel || "gemini-1.5-pro"})</span>
          </div>

          <div className="p-4 rounded border border-border bg-muted/30 flex items-center justify-between">
            <span className="t-label">Tổng sản phẩm Catalog</span>
            <span className="font-bold text-sm tabular">{status.catalogCount ?? 148} SP</span>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-2 text-sm t-meta">
          <div className="flex justify-between">
            <span>Nạp tri thức lần cuối:</span>
            <span className="font-mono text-foreground tabular">{formatDateTime(status.knowledgeLoadedAtMs)}</span>
          </div>
          <div className="flex justify-between">
            <span>Đồng bộ Catalog sản phẩm lần cuối:</span>
            <span className="font-mono text-foreground tabular">{formatDateTime(status.catalogSyncedAtMs)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tick hệ thống gần nhất:</span>
            <span className="font-mono text-foreground tabular">{formatDateTime(status.lastTickAtMs)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
