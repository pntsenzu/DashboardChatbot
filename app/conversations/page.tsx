import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { ConversationListItem, ConversationStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ConversationsToolbar } from "@/components/conversations-toolbar";
import { SearchX } from "lucide-react";

/**
 * Hội thoại là dữ liệu thay đổi liên tục -> KHÔNG cache (data-api §9).
 * next/dynamic URL cũng tự forced-dynamic, khai báo tường minh cho rõ ý định.
 */
export const dynamic = "force-dynamic";

const VALID_STATUS: ConversationStatus[] = ["attention", "active", "answered"];

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; limit?: string };
}) {
  const search = (searchParams.search || "").trim().slice(0, 120);
  const status = VALID_STATUS.includes(searchParams.status as ConversationStatus)
    ? (searchParams.status as ConversationStatus)
    : undefined;
  // data-api §9: limit phải nằm trong 20–200.
  const limitParam = Number(searchParams.limit);
  const limit = [20, 50, 100, 200].includes(limitParam) ? limitParam : 50;

  const conversations = await rpc<ConversationListItem[]>("getConversations", {
    search: search || undefined,
    status,
    limit,
  });

  const hasFilter = Boolean(search) || Boolean(status);

  const emptyState = hasFilter ? (
    <div className="p-10 text-center space-y-3" role="status">
      <SearchX className="w-8 h-8 text-muted-foreground mx-auto" aria-hidden="true" />
      <p className="t-label">Không có hội thoại nào khớp bộ lọc</p>
      <p className="t-meta">
        {search && (
          <>
            Từ khoá <b className="text-foreground">“{search}”</b>
            {" · "}
          </>
        )}
        {status && (
          <>
            Trạng thái{" "}
            <b className="text-foreground">
              {status === "attention" ? "Cần chú ý" : status === "active" ? "Đang chờ" : "Đã trả lời"}
            </b>
            {" · "}
          </>
        )}
        thử rút gọn từ khoá hoặc bỏ bộ lọc.
      </p>
      <Link
        href="/conversations"
        className="inline-block h-8 px-3 rounded-md border border-input bg-card text-xs font-medium leading-8 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Xoá bộ lọc
      </Link>
    </div>
  ) : (
    <div className="p-10 text-center space-y-2" role="status">
      <p className="t-label">Chưa có hội thoại nào</p>
      <p className="t-meta">Khi khách nhắn tin Messenger, hội thoại sẽ xuất hiện tại đây.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="t-overline text-primary">Quản lý Chatbot</span>
          <h1 className="t-page">Danh sách hội thoại</h1>
        </div>
        <p className="t-meta tabular">
          {conversations.length === 0
            ? "Không có dữ liệu"
            : `Hiển thị ${conversations.length} hội thoại`}
        </p>
      </div>

      <ConversationsToolbar search={search} status={status} limit={limit} />

      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        {conversations.length === 0 ? (
          emptyState
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-xs uppercase t-overline">
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Tin nhắn cuối</th>
                <th className="p-3">Số tin</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conversations.map((conv) => (
                <tr key={conv.conversationId} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3">
                    <Link
                      href={`/conversations/${conv.conversationId}`}
                      className="font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {conv.customerName || conv.customerId}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/conversations/${conv.conversationId}`}
                      className="t-meta text-foreground line-clamp-1 hover:text-primary"
                    >
                      {conv.lastMessageText}
                    </Link>
                  </td>
                  <td className="p-3 tabular font-mono text-xs">{conv.messageCount}</td>
                  <td className="p-3">
                    <Badge
                      variant={
                        conv.status === "attention"
                          ? "warning"
                          : conv.status === "active"
                            ? "priority"
                            : "success"
                      }
                    >
                      {conv.status === "attention"
                        ? "Cần chú ý"
                        : conv.status === "active"
                          ? "Chưa trả lời"
                          : "Đã trả lời"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right tabular text-xs t-meta">
                    {formatDateTime(conv.lastMessageAtMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
