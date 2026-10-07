import * as React from "react";
import { AlertTriangle, Inbox, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Trạng thái màn hình — §13 / nguyên tắc 6:
 * Đang tải (Skeleton) ≠ Lỗi ≠ Chưa có (empty) ≠ Không khớp bộ lọc (no-results).
 * Lỗi KHÔNG BAO GIỜ hiển thị như "chưa có dữ liệu" và KHÔNG hiện KPI = 0.
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
  title = "Chưa có dữ liệu",
  description,
  action,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <StateShell icon={<Inbox className="size-5" />} title={title} description={description} action={action} />
  );
}

/** Không khớp bộ lọc / tìm kiếm. */
function NoResultsState({
  title = "Không có kết quả nào khớp bộ lọc",
  description,
  action,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <StateShell
      icon={<SearchX className="size-5" />}
      title={title}
      description={description}
      action={action}
    />
  );
}

/** Lỗi tải — luôn kèm nút Thử lại. */
function ErrorState({
  title = "Không tải được dữ liệu",
  description,
  onRetry,
  digest,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  digest?: string;
}) {
  return (
    <StateShell
      variant="destructive"
      icon={<AlertTriangle className="size-5" />}
      title={title}
      description={description}
      action={
        onRetry || digest ? (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Thử lại
              </Button>
            ) : null}
            {digest ? (
              <span className="t-meta tabular" aria-hidden="true">
                Mã: {digest}
              </span>
            ) : null}
          </div>
        ) : null
      }
    />
  );
}

export { EmptyState, NoResultsState, ErrorState, StateShell };
