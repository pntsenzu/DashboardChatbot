import React from "react";
import { rpc } from "@/lib/senzu-api";
import { getDict } from "@/lib/i18n-server";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, CheckCircle2, XCircle } from "lucide-react";

// Trạng thái bot là heartbeat -> KHÔNG cache (data-api §9).
export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const status = await rpc("getSystemStatus");
  const t = getDict();
  const dl = t.dateLocale;

  return (
    <div className="space-y-4">
      <PageHeader overline={t.knowledge.overline} title={t.knowledge.title} />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground grid place-items-center">
              <Cpu className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="t-section">{t.knowledge.heartbeatTitle}</h2>
              <p className="t-meta">{t.knowledge.heartbeatDesc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="p-4 rounded border border-border bg-muted/30 flex items-center justify-between gap-3">
              <span className="t-label">{t.knowledge.rowChrome}</span>
              {status.chromeRunning ? (
                <Badge variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                  {t.knowledge.running}
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> {t.knowledge.stopped}
                </Badge>
              )}
            </div>

            <div className="p-4 rounded border border-border bg-muted/30 flex items-center justify-between gap-3">
              <span className="t-label">{t.knowledge.rowMessenger}</span>
              {status.messengerConnected ? (
                <Badge variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                  {t.knowledge.connected}
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                  {t.knowledge.disconnected}
                </Badge>
              )}
            </div>

            <div className="p-4 rounded border border-border bg-muted/30 flex items-center justify-between gap-3">
              <span className="t-label">{t.knowledge.rowModel}</span>
              <span className="font-semibold text-sm">
                {status.aiProvider || "Google Gemini"} ({status.aiModel || "gemini-1.5-pro"})
              </span>
            </div>

            <div className="p-4 rounded border border-border bg-muted/30 flex items-center justify-between gap-3">
              <span className="t-label">{t.knowledge.rowCatalog}</span>
              <span className="font-bold text-sm tabular">
                {formatNumber(status.catalogCount ?? 148, dl)} {t.knowledge.catalogUnit}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2 t-meta">
            <div className="flex justify-between gap-4">
              <span>{t.knowledge.lastKnowledge}</span>
              <span className="font-mono text-foreground tabular">
                {formatDateTime(status.knowledgeLoadedAtMs, dl)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t.knowledge.lastCatalog}</span>
              <span className="font-mono text-foreground tabular">
                {formatDateTime(status.catalogSyncedAtMs, dl)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t.knowledge.lastTick}</span>
              <span className="font-mono text-foreground tabular">
                {formatDateTime(status.lastTickAtMs, dl)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
