import React from "react";
import Link from "next/link";
import { rpc } from "@/lib/senzu-api";
import { ConversationStatus } from "@/lib/types";
import { fmt } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
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

/** Tiêu đề tab theo ngôn ngữ hiện tại (định dạng "%s · Senzu Chatbot Dashboard"). */
export function generateMetadata() {
  return { title: getDict().conversations.title };
}

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

  const conversations = await rpc("getConversations", {
    search: search || undefined,
    status,
    limit,
  });

  const t = getDict();
  const dl = t.dateLocale;
  const statusLabel = (value: ConversationStatus) =>
    value === "attention"
      ? t.common.status.attention
      : value === "active"
        ? t.common.status.active
        : t.common.status.answered;

  const hasFilter = Boolean(search) || Boolean(status);

  const emptyState = hasFilter ? (
    <div className="p-10 text-center space-y-3" role="status">
      <SearchX className="w-8 h-8 text-muted-foreground mx-auto" aria-hidden="true" />
      <p className="t-label">{t.conversations.filteredTitle}</p>
      <p className="t-meta">
        {search && (
          <>
            {t.conversations.filteredKeyword} <b className="text-foreground">“{search}”</b>
            {" · "}
          </>
        )}
        {status && (
          <>
            {t.conversations.filteredStatus}{" "}
            <b className="text-foreground">{statusLabel(status)}</b>
            {" · "}
          </>
        )}
        {t.conversations.filteredHint}
      </p>
      <Link
        href="/conversations"
        className="inline-flex h-8 items-center rounded-md border border-input bg-card px-3 text-sm font-medium shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11"
      >
        {t.common.clearFilter}
      </Link>
    </div>
  ) : (
    <div className="p-10 text-center space-y-2" role="status">
      <p className="t-label">{t.conversations.emptyTitle}</p>
      <p className="t-meta">{t.conversations.emptyDesc}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="t-overline text-primary">{t.conversations.overline}</span>
          <h1 className="t-page">{t.conversations.title}</h1>
        </div>
        <p className="t-meta tabular">
          {conversations.length === 0
            ? t.conversations.noData
            : fmt(t.conversations.countLabel, { n: conversations.length })}
        </p>
      </div>

      <ConversationsToolbar search={search} status={status} limit={limit} />

      {conversations.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
          {emptyState}
        </div>
      ) : (
        <>
          {/* Bảng chỉ từ ≥640px (§11) */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-xs sm:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 t-overline">
                  <th className="p-3">{t.conversations.thCustomer}</th>
                  <th className="p-3">{t.conversations.thLastMessage}</th>
                  <th className="p-3">{t.conversations.thMessageCount}</th>
                  <th className="p-3">{t.conversations.thStatus}</th>
                  <th className="p-3 text-right">{t.conversations.thTime}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {conversations.map((conv) => (
                  <tr key={conv.conversationId} className="transition-colors hover:bg-muted/40">
                    <td className="p-3">
                      <Link
                        href={`/conversations/${conv.conversationId}`}
                        className="rounded font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {conv.customerName || conv.customerId}
                      </Link>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/conversations/${conv.conversationId}`}
                        className="t-meta line-clamp-1 text-foreground hover:text-primary"
                      >
                        {conv.lastMessageText}
                      </Link>
                    </td>
                    <td className="t-meta p-3 font-mono tabular">{conv.messageCount}</td>
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
                        {statusLabel(conv.status)}
                      </Badge>
                    </td>
                    <td className="t-meta p-3 text-right tabular">
                      {formatDateTime(conv.lastMessageAtMs, dl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dưới 640px: danh sách xếp chồng — mẫu "Dòng hội thoại" (§14) */}
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-xs sm:hidden">
            {conversations.map((conv) => (
              <li key={conv.conversationId}>
                <Link
                  href={`/conversations/${conv.conversationId}`}
                  className="block min-h-14 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="t-label min-w-0 truncate">
                      {conv.customerName || conv.customerId}
                    </span>
                    <span className="shrink-0 text-2xs tabular text-muted-foreground">
                      {formatDateTime(conv.lastMessageAtMs, dl)}
                    </span>
                  </span>
                  <span className="t-meta mt-0.5 block truncate text-foreground">
                    {conv.lastMessageText}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        conv.status === "attention"
                          ? "warning"
                          : conv.status === "active"
                            ? "priority"
                            : "success"
                      }
                    >
                      {statusLabel(conv.status)}
                    </Badge>
                    <span className="t-meta tabular">
                      {fmt(t.conversations.messageUnit, { n: conv.messageCount })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
