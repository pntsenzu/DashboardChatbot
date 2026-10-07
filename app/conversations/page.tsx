import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { ConversationListItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const revalidate = 10;

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string };
}) {
  const search = searchParams.search || "";
  const statusFilter = searchParams.status;

  const conversations = await rpc<ConversationListItem[]>("getConversations", {
    search: search || undefined,
    status: statusFilter || undefined,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="t-overline text-primary">Quản lý Chatbot</span>
          <h1 className="t-page">Danh sách hội thoại</h1>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-2">
          <Link
            href="/conversations"
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${!statusFilter ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}
          >
            Tất cả
          </Link>
          <Link
            href="/conversations?status=attention"
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${statusFilter === "attention" ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}
          >
            Cần chú ý
          </Link>
          <Link
            href="/conversations?status=active"
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${statusFilter === "active" ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}
          >
            Đang chờ
          </Link>
          <Link
            href="/conversations?status=answered"
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${statusFilter === "answered" ? "bg-primary text-white border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}
          >
            Đã trả lời
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
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
            {conversations.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center t-meta">
                  Không tìm thấy hội thoại nào.
                </td>
              </tr>
            ) : (
              conversations.map((conv) => (
                <tr key={conv.conversationId} className="hover:bg-muted/40 transition-colors cursor-pointer">
                  <td className="p-3">
                    <Link href={`/conversations/${conv.conversationId}`} className="font-semibold text-foreground hover:text-primary">
                      {conv.customerName || conv.customerId}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Link href={`/conversations/${conv.conversationId}`} className="t-meta text-foreground line-clamp-1">
                      {conv.lastMessageText}
                    </Link>
                  </td>
                  <td className="p-3 tabular font-mono text-xs">{conv.messageCount}</td>
                  <td className="p-3">
                    <Badge variant={conv.status === "attention" ? "warning" : conv.status === "active" ? "priority" : "success"}>
                      {conv.status === "attention" ? "Cần chú ý" : conv.status === "active" ? "Chưa trả lời" : "Đã trả lời"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right tabular text-xs t-meta">
                    {formatDateTime(conv.lastMessageAtMs)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
