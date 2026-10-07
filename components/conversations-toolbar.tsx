"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Tabs, Tab } from "@/components/ui/tabs";
import { useI18n } from "@/components/i18n-provider";

/** Khóa dịch cho từng tab — chuỗi lấy từ từ điển ở trong component. */
const STATUS_TABS = ["", "attention", "active", "answered"] as const;

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
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(search);

  /** Nhãn cho một tab trạng thái (chuỗi dịch lấy từ từ điển). */
  const tabLabel = (key: (typeof STATUS_TABS)[number]) =>
    key === ""
      ? t.conversations.tabAll
      : key === "attention"
        ? t.common.status.attention
        : key === "active"
          ? t.common.status.active
          : t.common.status.answered;

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
          placeholder={t.conversations.searchPlaceholder}
          aria-label={t.conversations.searchLabel}
          className="flex-1 max-w-sm"
        />
        <input type="hidden" name="status" value={status} />
        <Button type="submit">{t.conversations.find}</Button>
        {hasFilter && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft("");
              router.push("/conversations");
            }}
          >
            <X aria-hidden="true" /> {t.common.clearFilter}
          </Button>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs trạng thái — giữ nguyên ?search= đang có */}
        <Tabs label={t.conversations.tabsLabel}>
          {STATUS_TABS.map((key) => (
            <Tab key={key || "all"} href={hrefFor({ status: key })} active={status === key}>
              {tabLabel(key)}
            </Tab>
          ))}
        </Tabs>

        {/* Số dòng — API không có offset nên đây là giới hạn tải về, không phải trang */}
        <label className="flex items-center gap-2 t-meta">
          {t.conversations.limitPrefix}
          <select
            value={limit}
            onChange={(e) => go({ limit: Number(e.target.value) })}
            aria-label={t.conversations.limitAria}
            className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11"
          >
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {t.conversations.limitSuffix}
        </label>
      </div>
    </div>
  );
}
