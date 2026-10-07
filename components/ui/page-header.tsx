import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — hàng tiêu đề trang: overline + h1 + mô tả | hành động (§8).
 * MỘT h1 mỗi trang (§15).
 */
function PageHeader({
  overline,
  title,
  description,
  action,
  className,
}: {
  overline?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="min-w-0">
        {overline ? <span className="t-overline block text-primary">{overline}</span> : null}
        <h1 className="t-page truncate">{title}</h1>
        {description ? <p className="t-meta mt-0.5">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

export { PageHeader };
