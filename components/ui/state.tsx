"use client";

import * as React from "react";
import { AlertTriangle, Inbox, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

/**
 * Trạng thái màn hình — §13 / nguyên tắc 6:
 * Đang tải (Skeleton) ≠ Lỗi ≠ Chưa có (empty) ≠ Không khớp bộ lọc (no-results).
 * Lỗi KHÔNG BAO GIỜ hiển thị như "chưa có dữ liệu" và KHÔNG hiện KPI = 0.
 *
 * Chuỗi mặc định lấy theo locale hiện tại; mọi trang đều có thể ghi đè
 * bằng props `title`/`description`.
 */

function StateShell({
  icon,
  title,
  description,
  action,
  variant = "neutral",
  className,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "neutral" | "destructive";
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn("p-10 text-center space-y-3", className)}
    >
      <div
        className={cn(
          "mx-auto grid size-10 place-items-center rounded-full",
          variant === "destructive"
            ? "bg-destructive-subtle text-destructive"
            : "bg-muted text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className={cn("t-label", variant === "destructive" && "text-destructive")}>{title}</p>
      {description ? <p className="t-meta mx-auto max-w-[42ch]">{description}</p> : null}
      {action}
    </div>
  );
}

/** Chưa có dữ liệu (không áp bộ lọc). */
function EmptyState({
  title,
  description,
  action,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <StateShell
      icon={<Inbox className="size-5" />}
      title={title ?? t.states.emptyTitle}
      description={description}
      action={action}
    />
  );
}

/** Không khớp bộ lọc / tìm kiếm. */
function NoResultsState({
  title,
  description,
  action,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <StateShell
      icon={<SearchX className="size-5" />}
      title={title ?? t.states.noResultsTitle}
      description={description}
      action={action}
    />
  );
}

/** Lỗi tải — luôn kèm nút Thử lại. */
function ErrorState({
  title,
  description,
  onRetry,
  digest,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  digest?: string;
}) {
  const { t } = useI18n();
  return (
    <StateShell
      variant="destructive"
      icon={<AlertTriangle className="size-5" />}
      title={title ?? t.states.errorTitle}
      description={description}
      action={
        onRetry || digest ? (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {t.common.retry}
              </Button>
            ) : null}
            {digest ? (
              <span className="t-meta tabular" aria-hidden="true">
                {t.states.errorCode} {digest}
              </span>
            ) : null}
          </div>
        ) : null
      }
    />
  );
}

export { EmptyState, NoResultsState, ErrorState, StateShell };
