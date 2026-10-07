import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { ConversationMessage, MessageProcessing, AttentionItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, Bot, User, Cpu, AlertTriangle } from "lucide-react";

export const revalidate = 5;

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const conversationId = params.id;

  const [messages, processing, attention] = await Promise.all([
    rpc<ConversationMessage[]>("getConversationMessages", conversationId),
    rpc<MessageProcessing[]>("getConversationProcessing", conversationId),
    rpc<AttentionItem[]>("getConversationAttention", conversationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href="/conversations">
          <button className="h-8 w-8 rounded-md border border-input bg-card grid place-items-center hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <span className="t-overline text-primary">Chi tiết hội thoại</span>
          <h1 className="t-page">Thread: {conversationId}</h1>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="p-4 rounded-lg border border-warning-border bg-warning-subtle space-y-2">
          <div className="t-section text-warning flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Cảnh báo cần chú ý
          </div>
          {attention.map((a) => (
            <div key={a.id} className="text-xs text-foreground">
              <b>{a.type}</b>: {a.messagePreview || a.detail}
            </div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-4 min-h-[400px]">
        <div className="t-overline border-b border-border pb-2">Lịch sử tin nhắn</div>
        
        <div className="space-y-3">
          {messages.map((msg) => {
            const isBot = msg.direction === "outgoing";
            const proc = processing.find((p) => p.incomingMessageId === msg.id);

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${isBot ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] t-meta mb-1">
                  {isBot ? <Bot className="w-3 h-3 text-primary" /> : <User className="w-3 h-3 text-muted-foreground" />}
                  <span>{msg.senderName || (isBot ? "Bot AI" : "Khách")}</span>
                  <span className="tabular">{formatDateTime(msg.timestampMs)}</span>
                </div>

                <div
                  className={`p-3 rounded-lg text-sm leading-relaxed border shadow-xs ${
                    isBot
                      ? "bg-accent border-accent-foreground/20 text-accent-foreground rounded-br-none"
                      : "bg-card border-border text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>

                {proc && (
                  <div className="mt-1 text-[10px] t-meta flex items-center gap-2 bg-muted/60 px-2 py-0.5 rounded border border-border">
                    <Cpu className="w-3 h-3" />
                    <span>Model: {proc.aiModel}</span>
                    <span>Knowledge: {proc.knowledgePath}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
