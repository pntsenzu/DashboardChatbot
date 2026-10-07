"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TabCount } from "@/components/ui/badge";

/**
 * Tabs — bộ lọc trạng thái dạng link (URL là nguồn sự thật, không state cục bộ).
 * Dùng `aria-current="page"` thay vì `role="tab"` vì mỗi tab là một URL thật,
 * tránh giả vờ semantics tabpanel khi không có panel (§15).
 */
function Tabs({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1",
        className
      )}
    >
      {children}
    </nav>
  );
}

function Tab({
  href,
  active,
  count,
  children,
  className,
}: {
  href: string;
  active?: boolean;
  count?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-8 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset coarse:h-11",
        active
          ? "bg-card text-foreground shadow-xs ring-1 ring-border"
          : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
        className
      )}
    >
      <span className="truncate">{children}</span>
      {typeof count === "number" ? <TabCount>{count}</TabCount> : null}
    </Link>
  );
}

export { Tabs, Tab };
