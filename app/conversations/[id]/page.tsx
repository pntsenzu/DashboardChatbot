import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, Bot, User, Cpu } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Section, Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";

// Hội thoại là dữ liệu trực tiếp từ bot -> KHÔNG cache (data-api §9).
export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const conversationId = params.id;

  const [messages, processing, attention] = await Promise.all([
    rpc("getConversationMessages", conversationId),
    rpc("getConversationProcessing", conversationId),
    rpc("getConversationAttention", conversationId),
  ]);

  return (
    <div className="space-y-6">
      {/* Màn chi tiết: tiêu đề trang = link quay lại (§7) */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/conversations"
            className="hit-area inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại danh sách hội thoại
          </Link>
          <h1 className="t-page mt-1 truncate">Thread: {conversationId}</h1>
          <p className="t-meta tabular">
            {messages.length} tin nhắn · {processing.length} lượt xử lý AI
          </p>
        </div>
      </div>

      {attention.length > 0 && (
        <Alert variant="warning" title="Cảnh báo cần chú ý">
          <ul className="mt-1 space-y-1">
            {attention.map((a) => (
              <li key={a.id} className="t-meta text-foreground">
                <b className="text-foreground">{a.type}</b>: {a.messagePreview || a.detail}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <Section
        titleId="message-history"
        title="Lịch sử tin nhắn"
        description="Bên trái: khách gửi · Bên phải: bot / nhân viên trả lời"
      >
        <Card>
          <CardContent className="min-h-[400px] space-y-4">
            {messages.length === 0 ? (
              <EmptyState
                title="Chưa có tin nhắn nào"
                description="Hội thoại này chưa ghi nhận tin nhắn."
              />
            ) : (
              <ul className="space-y-3">
                {messages.map((msg) => {
                  const isBot = msg.direction === "outgoing";
                  const proc = processing.find((p) => p.incomingMessageId === msg.id);

                  return (
                    <li
                      key={msg.id}
                      className={`flex max-w-[85%] flex-col sm:max-w-[75%] ${
                        isBot ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <span className="t-meta mb-1 flex items-center gap-1.5">
                        {isBot ? (
                          <Bot className="size-3 text-primary" aria-hidden="true" />
                        ) : (
                          <User className="size-3 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span>{msg.senderName || (isBot ? "Bot AI" : "Khách")}</span>
                        <span className="tabular text-2xs">{formatDateTime(msg.timestampMs)}</span>
                      </span>

                      {/* Bong bóng tin nhắn (§14) — có tiền tố sr-only cho screen reader */}
                      <div
                        className={`rounded-lg border px-3 py-2 text-sm leading-6 shadow-xs ${
                          isBot
                            ? "rounded-br-sm border-primary/15 bg-accent text-accent-foreground"
                            : "rounded-bl-sm border-border bg-card text-foreground"
                        }`}
                      >
                        <span className="sr-only">{isBot ? "Bạn gửi: " : "Khách gửi: "}</span>
                        {msg.text}
                      </div>

                      {proc ? (
                        <span className="mt-1 flex items-center gap-2 rounded border border-border bg-muted/60 px-2 py-0.5 text-2xs">
                          <Cpu className="size-3" aria-hidden="true" />
                          <span className="tabular">Model: {proc.aiModel}</span>
                          <span className="truncate">Knowledge: {proc.knowledgePath}</span>
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
