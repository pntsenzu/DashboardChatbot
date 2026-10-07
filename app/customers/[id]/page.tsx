import React from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rpc } from "@/lib/senzu-api";
import { CustomerDetail, CustomerInterest, CustomerNote, ConversationListItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, ShoppingBag, FileText, Send } from "lucide-react";

// Hồ sơ khách gồm cả hội thoại -> KHÔNG cache (data-api §9).
export const dynamic = "force-dynamic";

// Server Action for adding note
async function addNoteAction(formData: FormData) {
  "use server";
  const customerId = String(formData.get("customerId") || "");
  const text = String(formData.get("text") || "").trim();
  if (!text || !customerId) return;

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

  // getCustomerConversations: danh sách hội thoại của khách (data-api §6).
  const [detail, interests, notes, conversations] = await Promise.all([
    rpc<CustomerDetail | null>("getCustomerDetail", customerId),
    rpc<CustomerInterest[]>("getCustomerInterests", customerId),
    rpc<CustomerNote[]>("getCustomerNotes", customerId),
    rpc<ConversationListItem[]>("getCustomerConversations", customerId, 10),
  ]);

  if (!detail) {
    // Trả status 404 thật (không phải trang 404 giả status 200).
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link
          href="/customers"
          aria-label="Quay lại danh sách khách hàng"
          className="h-8 w-8 rounded-md border border-input bg-card grid place-items-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Link>
        <div>
          <span className="t-overline text-primary">Hồ sơ khách hàng</span>
          <h1 className="t-page">{detail.customerName || detail.customerId}</h1>
        </div>
      </div>

      {/* Info Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Tổng tin nhắn</div>
          <div className="t-metric tabular">{detail.totalMessages}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Tổng hội thoại</div>
          <div className="t-metric tabular">{detail.totalConversations}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Tương tác đầu</div>
          <div className="text-sm font-semibold tabular mt-2">{formatDateTime(detail.firstInteractionMs)}</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
          <div className="t-meta">Tương tác cuối</div>
          <div className="text-sm font-semibold tabular mt-2">{formatDateTime(detail.lastInteractionMs)}</div>
        </div>
      </div>

      {/* Products Interested */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
        <h3 className="t-card flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" /> Sản phẩm đã hỏi
        </h3>
        <div className="space-y-2">
          {interests.length === 0 ? (
            <p className="t-meta">Chưa ghi nhận câu hỏi sản phẩm nào.</p>
          ) : (
            interests.map((item) => (
              <div key={item.productId} className="p-3 rounded border border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <div className="t-label">{item.productName || item.productId}</div>
                  <div className="t-meta">Số lần hỏi: {item.totalMentions} · Hỏi giá: {item.priceCount} · Đặt hàng: {item.orderCount}</div>
                </div>
                <div className="t-meta tabular">{formatDateTime(item.lastMentionAtMs)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversations của khách */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3">
        <h3 className="t-card flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> Hội thoại gần đây
        </h3>
        {conversations.length === 0 ? (
          <p className="t-meta">Chưa có hội thoại nào được ghi nhận.</p>
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
                    {conv.status === "attention"
                      ? "Cần chú ý"
                      : conv.status === "active"
                        ? "Chưa trả lời"
                        : "Đã trả lời"}{" "}
                    · {conv.messageCount} tin
                  </div>
                </div>
                <div className="t-meta tabular whitespace-nowrap">
                  {formatDateTime(conv.lastMessageAtMs)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Notes Section (Staff Notes) */}
      <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-4">
        <h3 className="t-card flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Ghi chú nhân viên (Append-only)
        </h3>

        {/* Form to Add Note */}
        <form action={addNoteAction} className="flex gap-2">
          <input type="hidden" name="customerId" value={customerId} />
          <input
            type="text"
            name="text"
            placeholder="Nhập ghi chú mới cho khách hàng..."
            required
            className="flex-1 h-9 px-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" variant="default" size="sm">
            <Send className="w-3.5 h-3.5" /> Thêm ghi chú
          </Button>
        </form>

        {/* Existing Notes List */}
        <div className="space-y-2 pt-2 border-t border-border">
          {notes.length === 0 ? (
            <p className="t-meta">Chưa có ghi chú nào từ nhân viên.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="p-3 rounded border border-border bg-accent/40 space-y-1">
                <div className="flex items-center justify-between text-xs t-meta">
                  <span className="font-semibold text-foreground">{n.authorName || n.authorEmail}</span>
                  <span className="tabular">{formatDateTime(n.createdAtMs)}</span>
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
