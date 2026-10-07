import * as React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "info" | "success" | "warning" | "destructive";

const TONE: Record<AlertVariant, { box: string; icon: string; Icon: typeof Info }> = {
  default: { box: "border-border bg-muted/60 text-foreground", icon: "text-muted-foreground", Icon: Info },
  info: { box: "border-info-border bg-info-subtle", icon: "text-info", Icon: Info },
  success: { box: "border-success-border bg-success-subtle", icon: "text-success", Icon: CheckCircle2 },
  warning: { box: "border-warning-border bg-warning-subtle", icon: "text-warning", Icon: AlertTriangle },
  destructive: {
    box: "border-destructive-border bg-destructive-subtle",
    icon: "text-destructive",
    Icon: AlertTriangle,
  },
};

/**
 * Alert — §13: `flex flex-wrap gap-x-3 rounded-lg border px-4 py-3 text-sm`,
 * icon 16 theo tone, tiêu đề `font-medium`, mô tả muted, hành động `ml-auto`.
 * `role="alert"` cho lỗi/cảnh báo, `status` cho thông tin.
 *
 * Khi truyền `title`/`description`/`action` thì render đúng cấu trúc của spec;
 * vẫn nhận `children` để dùng tự do.
 */
export function Alert({
  variant = "default",
  title,
  description,
  action,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const tone = TONE[variant];
  const Icon = tone.Icon;
  const role = variant === "destructive" || variant === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={cn("flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm", tone.box, className)}
      {...props}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        {description ? <p className="t-meta">{description}</p> : null}
        {children}
      </div>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}

/** Lỗi cấp form: thay chỗ cho gợi ý `t-meta` (§10). */
export function InlineError({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive",
        className
      )}
      {...props}
    />
  );
}
