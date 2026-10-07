"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Tabs, Tab } from "@/components/ui/tabs";

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
 * Tabs là <Link> thật tới URL, không phải state cục bộ (§7: URL là nguồn sự thật).
 */
export function ConversationsToolbar({ search, status = "", limit }: ToolbarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(search);

  /** Xây URL cho một tổ hợp bộ lọc — dùng cho cả <Link href> lẫn router.push. */
  const hrefFor = (patch: Record<string, string | number | undefined>) => {
    const next = { search, status, limit, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set("search", String(next.search));
    if (next.status) params.set("status", String(next.status));
    if (next.limit && Number(next.limit) !== 50) params.set("limit", String(next.limit));
    const qs = params.toString();
    return qs ? `/conversations?${qs}` : "/conversations";
  };

  const go = (patch: Record<string, string | number | undefined>) => router.push(hrefFor(patch));

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
        <SearchInput
          ref={inputRef}
          name="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tìm theo tên khách hoặc nội dung tin…"
          aria-label="Tìm kiếm hội thoại"
          className="flex-1 max-w-sm"
        />
        <input type="hidden" name="status" value={status} />
        <Button type="submit">Tìm</Button>
        {hasFilter && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft("");
              router.push("/conversations");
            }}
          >
            <X aria-hidden="true" /> Xoá bộ lọc
          </Button>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs trạng thái — giữ nguyên ?search= đang có */}
        <Tabs label="Lọc theo trạng thái">
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.key || "all"}
              href={hrefFor({ status: tab.key })}
              active={status === tab.key}
            >
              {tab.label}
            </Tab>
          ))}
        </Tabs>

        {/* Số dòng — API không có offset nên đây là giới hạn tải về, không phải trang */}
        <label className="flex items-center gap-2 t-meta">
          Hiển thị
          <select
            value={limit}
            onChange={(e) => go({ limit: Number(e.target.value) })}
            aria-label="Số hội thoại hiển thị"
            className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11"
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
