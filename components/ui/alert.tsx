import * as React from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "info" | "success" | "warning" | "destructive";

/**
 * Alert — §13 phản hồi: nền subtle + viền tone, icon + chữ (KHÔNG chỉ màu).
 * `destructive` dùng `role="alert"` để trình đọc màn hình báo ngay.
 */
const alertVariants: Record<AlertVariant, string> = {
  default: "border-border bg-muted/60 text-foreground",
  info: "border-info-border bg-info-subtle text-info",
  success: "border-success-border bg-success-subtle text-success",
  warning: "border-warning-border bg-warning-subtle text-warning",
  destructive: "border-destructive-border bg-destructive-subtle text-destructive",
};

function Alert({
  variant = "default",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  const alertVariant = variant;
  return (
    <div
      role={alertVariant === "destructive" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
        alertVariants[alertVariant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Lỗi cấp form: thay chỗ cho gợi ý `t-meta` (§10). */
function InlineError({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
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

export { Alert, InlineError, alertVariants };
