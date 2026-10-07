import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — §9: CHỈ cho trạng thái / phân loại, không làm nhãn trang trí.
 * Mỗi tone = `border-{tone}-border bg-{tone}-subtle text-{tone}`.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-2xs font-medium transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-muted-foreground",
        success: "border-success-border bg-success-subtle text-success",
        info: "border-info-border bg-info-subtle text-info",
        warning: "border-warning-border bg-warning-subtle text-warning",
        priority: "border-priority-border bg-priority-subtle text-priority",
        destructive: "border-destructive-border bg-destructive-subtle text-destructive",
        brand: "border-transparent bg-accent text-accent-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** TabCount: số đếm tròn, luôn `.tabular` (§9). */
function TabCount({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-w-4 items-center justify-center rounded-full bg-muted px-1 text-2xs font-medium tabular text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants, TabCount };
