import React from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rpc } from "@/lib/senzu-api";
import { CustomerDetail, CustomerInterest, CustomerNote } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, FileText, Send } from "lucide-react";

export const revalidate = 5;

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

  // Ghi chú: getCustomerConversations chưa render (sẽ thêm UI ở Phase 2),
  // hiện không gọi để tránh 1 round-trip thừa tới Data API.
  const [detail, interests, notes] = await Promise.all([
    rpc<CustomerDetail | null>("getCustomerDetail", customerId),
    rpc<CustomerInterest[]>("getCustomerInterests", customerId),
    rpc<CustomerNote[]>("getCustomerNotes", customerId),
  ]);

  if (!detail) {
    return (
      <div className="p-8 text-center">
        <h1 className="t-page">404 - Khách hàng không tồn tại</h1>
        <Link href="/customers" className="t-meta text-primary hover:underline mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href="/customers">
          <button className="h-8 w-8 rounded-md border border-input bg-card grid place-items-center hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </button>
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
