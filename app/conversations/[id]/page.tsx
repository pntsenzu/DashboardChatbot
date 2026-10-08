import React, { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { rpc } from "@/lib/senzu-api";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, Bot, User, Cpu } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Section, Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";

// Hội thoại là dữ liệu trực tiếp từ bot -> KHÔNG cache (data-api §9).
export const dynamic = "force-dynamic";

/**
 * Lấy tin nhắn của một thread. Dùng `cache()` để `generateMetadata` (kiểm tra
 * tồn tại TRƯỚC khi stream shell -> HTTP 404 thật) và trang render dùng chung
 * đúng MỘT lần gọi API trong cùng request (DEF-02).
 */
const getThreadMessages = cache((id: string) => rpc("getConversationMessages", id));

/** Tiêu đề tab = đúng heading h1 của trang (định dạng "%s · Senzu Chatbot Dashboard"). */
export async function generateMetadata({ params }: { params: { id: string } }) {
  const messages = await getThreadMessages(params.id);
  if (messages.length === 0) notFound();
  const t = getDict();
  return { title: `${t.conversationDetail.threadPrefix} ${params.id}` };
}

/**
 * Chỉ giữ lại TÊN FILE của tri thức (`…/knowledge/senzu.md` -> `senzu.md`):
 * đường dẫn tuyệt đối của server là thông tin nội bộ, không được đưa ra browser (DEF-03).
 */
function knowledgeFileName(path: string | null): string | null {
  if (!path) return path;
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const conversationId = params.id;

  const [messages, processing, attention] = await Promise.all([
    getThreadMessages(conversationId),
    rpc("getConversationProcessing", conversationId),
    rpc("getConversationAttention", conversationId),
  ]);

  // Id không tồn tại (hoặc không có tin nào) -> 404 thật, KHÔNG dựng "thread rỗng"
  // giả để người dùng tưởng hội thoại đã tồn tại (DEF-02) — nhất quán với /customers/[id].
  if (messages.length === 0) notFound();

  const t = getDict();
  const dl = t.dateLocale;

  return (
    <div className="space-y-4">
      {/* Màn chi tiết: tiêu đề trang = link quay lại (§7) */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/conversations"
            className="hit-area inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.conversationDetail.back}
          </Link>
          <h1 className="t-page mt-1 truncate">
            {t.conversationDetail.threadPrefix} {conversationId}
          </h1>
          <p className="t-meta tabular">
            {fmt(t.conversationDetail.meta, {
              messages: messages.length,
              processings: processing.length,
            })}
          </p>
        </div>
      </div>

      {attention.length > 0 && (
        <Alert variant="warning" title={t.conversationDetail.warningTitle}>
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
        title={t.conversationDetail.historyTitle}
        description={t.conversationDetail.historyDesc}
      >
        <Card>
          <CardContent className="space-y-4">
            {messages.length === 0 ? (
              <EmptyState
                title={t.conversationDetail.emptyTitle}
                description={t.conversationDetail.emptyDesc}
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
                        <span>
                          {msg.senderName ||
                            (isBot
                              ? t.conversationDetail.senderBot
                              : t.conversationDetail.senderCustomer)}
                        </span>
                        <span className="tabular text-2xs">{formatDateTime(msg.timestampMs, dl)}</span>
                      </span>

                      {/* Bong bóng tin nhắn (§14) — có tiền tố sr-only cho screen reader */}
                      <div
                        className={`rounded-lg border px-3 py-2 text-sm leading-6 shadow-xs ${
                          isBot
                            ? "rounded-br-sm border-primary/15 bg-accent text-accent-foreground"
                            : "rounded-bl-sm border-border bg-card text-foreground"
                        }`}
                      >
                        <span className="sr-only">
                          {isBot
                            ? t.conversationDetail.srYou
                            : t.conversationDetail.srCustomer}
                        </span>
                        {msg.text}
                      </div>

                      {proc ? (
                        <span className="mt-1 flex items-center gap-2 rounded border border-border bg-muted/60 px-2 py-0.5 text-2xs">
                          <Cpu className="size-3" aria-hidden="true" />
                          <span className="tabular">
                            {t.conversationDetail.modelLabel} {proc.aiModel}
                          </span>
                          <span className="truncate">
                            {t.conversationDetail.knowledgeLabel}{" "}
                            {knowledgeFileName(proc.knowledgePath)}
                          </span>
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
