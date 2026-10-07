import React from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rpc } from "@/lib/senzu-api";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MetricGrid, Metric } from "@/components/ui/metric";
import { ArrowLeft, MessageSquare, ShoppingBag, FileText, Send } from "lucide-react";

// Hồ sơ khách gồm cả hội thoại -> KHÔNG cache (data-api §9).
export const dynamic = "force-dynamic";

// Server Action for adding note
async function addNoteAction(formData: FormData) {
  "use server";
  const customerId = String(formData.get("customerId") || "");
  const text = String(formData.get("text") || "").trim();
  // data-api §9: UI tự giới hạn ghi chú (tối đa 2000 ký tự).
  if (!text || text.length > 2000 || !customerId) return;

  // data-api §9: insertCustomerNote tin tưởng tác giả do bên gọi gửi lên,
  // nên BẮT BUỘC lấy từ session — không bao giờ hardcode.
  const session = await getServerSession(authOptions);
  const authorEmail = session?.user?.email;
  if (!session || !authorEmail) {
    console.warn("insertCustomerNote bị từ chối: không có session hợp lệ.");
    return;
  }
  const authorName = session.user?.name || authorEmail.split("@")[0];

  await rpc("insertCustomerNote", customerId, authorEmail, authorName, text);
  revalidatePath(`/customers/${customerId}`);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const customerId = params.id;
  const t = getDict();
  const dl = t.dateLocale;

  // getCustomerConversations: danh sách hội thoại của khách (data-api §6).
  const [detail, interests, notes, conversations] = await Promise.all([
    rpc("getCustomerDetail", customerId),
    rpc("getCustomerInterests", customerId),
    rpc("getCustomerNotes", customerId),
    rpc("getCustomerConversations", customerId, 10),
  ]);

  if (!detail) {
    // Trả status 404 thật (không phải trang 404 giả status 200).
    notFound();
  }

  const statusLabel = (value: string) =>
    value === "attention"
      ? t.common.status.attention
      : value === "active"
        ? t.common.status.active
        : t.common.status.answered;

  return (
    <div className="space-y-4">
      {/* Màn chi tiết: tiêu đề trang = link quay lại (§7) */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <Link
            href="/customers"
            className="hit-area inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.customerDetail.back}
          </Link>
          <span className="t-overline block text-primary">{t.customerDetail.overline}</span>
          <h1 className="t-page truncate">{detail.customerName || detail.customerId}</h1>
        </div>
      </div>

      {/* Info Stats — một khung hairline (§11) */}
      <MetricGrid className="sm:grid-cols-4" aria-label={t.customerDetail.overline}>
        <Metric
          label={t.customerDetail.statMessages}
          value={formatNumber(detail.totalMessages, dl)}
        />
        <Metric
          label={t.customerDetail.statConversations}
          value={formatNumber(detail.totalConversations, dl)}
        />
        <Metric
          label={t.customerDetail.statFirst}
          value={
            <span className="text-sm font-semibold tabular">
              {formatDateTime(detail.firstInteractionMs, dl)}
            </span>
          }
        />
        <Metric
          label={t.customerDetail.statLast}
          value={
            <span className="text-sm font-semibold tabular">
              {formatDateTime(detail.lastInteractionMs, dl)}
            </span>
          }
        />
      </MetricGrid>

      {/* Products Interested */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
        <h3 className="t-card flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" /> {t.customerDetail.productsTitle}
        </h3>
        <div className="space-y-2">
          {interests.length === 0 ? (
            <p className="t-meta">{t.customerDetail.productsEmpty}</p>
          ) : (
            interests.map((item) => (
              <div key={item.productId} className="p-3 rounded border border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <div className="t-label">{item.productName || item.productId}</div>
                  <div className="t-meta">
                    {fmt(t.customerDetail.productStats, {
                      mentions: item.totalMentions,
                      price: item.priceCount,
                      order: item.orderCount,
                    })}
                  </div>
                </div>
                <div className="t-meta tabular">{formatDateTime(item.lastMentionAtMs, dl)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversations của khách */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
        <h3 className="t-card flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> {t.customerDetail.conversationsTitle}
        </h3>
        {conversations.length === 0 ? (
          <p className="t-meta">{t.customerDetail.conversationsEmpty}</p>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conv) => (
              <Link
                key={conv.conversationId}
                href={`/conversations/${conv.conversationId}`}
                className="flex items-center justify-between gap-4 py-3 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 -mx-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{conv.lastMessageText}</div>
                  <div className="t-meta">
                    {fmt(t.customerDetail.convMeta, {
                      status: statusLabel(conv.status),
                      n: conv.messageCount,
                    })}
                  </div>
                </div>
                <div className="t-meta tabular whitespace-nowrap">
                  {formatDateTime(conv.lastMessageAtMs, dl)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Notes Section (Staff Notes) */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-4">
        <h3 className="t-card flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> {t.customerDetail.notesTitle}
        </h3>

        {/* Form to Add Note */}
        <form action={addNoteAction} className="flex gap-2">
          <input type="hidden" name="customerId" value={customerId} />
          <input
            type="text"
            name="text"
            placeholder={t.customerDetail.notePlaceholder}
            required
            maxLength={2000}
            className="flex-1 h-9 px-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring coarse:h-11"
          />
          <Button type="submit" variant="default" size="sm">
            <Send className="w-3.5 h-3.5" /> {t.customerDetail.noteSubmit}
          </Button>
        </form>

        {/* Existing Notes List */}
        <div className="space-y-2 pt-2 border-t border-border">
          {notes.length === 0 ? (
            <p className="t-meta">{t.customerDetail.notesEmpty}</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="p-3 rounded border border-border bg-accent/40 space-y-1">
                <div className="flex items-center justify-between t-meta">
                  <span className="font-semibold text-foreground">{n.authorName || n.authorEmail}</span>
                  <span className="tabular">{formatDateTime(n.createdAtMs, dl)}</span>
                </div>
                <p className="text-sm text-foreground">{n.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
