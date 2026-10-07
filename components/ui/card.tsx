import * as React from "react";
import { cn } from "@/lib/utils";

/** Card — bề mặt có ranh giới thật: `rounded-lg border bg-card shadow-xs` (§11). */
function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card shadow-xs", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex justify-between gap-3 px-4 pt-4 sm:px-5", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-t border-border px-4 py-3", className)} {...props} />
  );
}

/**
 * Section — nhóm nội dung cấp trang, KHÔNG khung (nguyên tắc 3).
 * Luôn kèm `aria-labelledby` trỏ tới tiêu đề của nó.
 */
function Section({
  className,
  titleId,
  title,
  description,
  action,
  children,
}: {
  className?: string;
  titleId: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className={cn("space-y-3", className)}>
      <div className="flex min-h-8 min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="t-section truncate">
            {title}
          </h2>
          {description ? <p className="t-meta">{description}</p> : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export { Card, CardHeader, CardContent, CardFooter, Section };
