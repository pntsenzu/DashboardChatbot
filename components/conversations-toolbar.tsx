"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "attention", label: "Cần chú ý" },
  { key: "active", label: "Đang chờ" },
  { key: "answered", label: "Đã trả lời" },
] as const;

interface ToolbarProps {
  search: string;
  status?: string;
  limit: number;
}

/**
 * Toolbar lọc hội thoại. Toàn bộ trạng thái nằm trên URL (?search=&status=&limit=)
 * để link, refresh và nút Back của trình duyệt đều hoạt động đúng.
 */
export function ConversationsToolbar({ search, status = "", limit }: ToolbarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(search);

  const go = (patch: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const next = { search, status, limit, ...patch };
    if (next.search) params.set("search", String(next.search));
    if (next.status) params.set("status", String(next.status));
    if (next.limit && Number(next.limit) !== 50) params.set("limit", String(next.limit));
    const qs = params.toString();
    router.push(qs ? `/conversations?${qs}` : "/conversations");
  };

  const hasFilter = Boolean(search || status);

  return (
    <div className="space-y-3">
      <form
        method="GET"
        action="/conversations"
        role="search"
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go({ search: draft.trim() });
        }}
      >
        <div className="relative flex-1 max-w-sm">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            name="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tìm theo tên khách hoặc nội dung tin…"
            aria-label="Tìm kiếm hội thoại"
            className="h-9 w-full pl-9 pr-3 rounded-md border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <input type="hidden" name="status" value={status} />
        <button
          type="submit"
          className="h-9 px-3.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover text-sm font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Tìm
        </button>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              router.push("/conversations");
            }}
            className="h-9 px-3 rounded-md border border-input bg-card text-sm hover:bg-muted flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" /> Xoá bộ lọc
          </button>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs trạng thái — giữ nguyên ?search= đang có */}
        <div role="tablist" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.key;
            return (
              <button
                key={tab.key || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => go({ status: tab.key })}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Số dòng — API không có offset nên đây là giới hạn tải về, không phải trang */}
        <label className="flex items-center gap-2 t-meta">
          Hiển thị
          <select
            value={limit}
            onChange={(e) => go({ limit: Number(e.target.value) })}
            aria-label="Số hội thoại hiển thị"
            className="h-8 px-2 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          hội thoại
        </label>
      </div>
    </div>
  );
}
