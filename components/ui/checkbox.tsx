import * as React from "react";
import { cn } from "@/lib/utils";

/** Checkmark vẽ lại bằng SVG data-uri: 16px, viền `--input`, chọn = nền primary + check trắng. */
const CHECK =
  "bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22%3E%3Cpath%20fill=%22none%22%20stroke=%22%23fff%22%20stroke-width=%222.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20d=%22M3.5%208.5l3%203%206-6%22/%3E%3C/svg%3E')] bg-[length:14px_14px] bg-center bg-no-repeat";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Checkbox — §10: `<input type="checkbox">` native vẽ lại; CẢ NHÃN là vùng bấm;
 * trên cảm ứng `min-h-11`. Không lồng control trong control (§15).
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const descId = description ? `${inputId}-desc` : undefined;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer items-start gap-2.5 rounded-md py-1.5 text-sm text-foreground coarse:min-h-11 coarse:items-center",
          className
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-describedby={descId}
          className={cn(
            "mt-0.5 size-4 shrink-0 appearance-none rounded-sm border border-input bg-card transition-colors",
            "checked:border-primary checked:bg-primary",
            CHECK,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "coarse:mt-0"
          )}
          {...props}
        />
        <span className="min-w-0">
          <span className="t-label block">{label}</span>
          {description ? (
            <span id={descId} className="t-meta block">
              {description}
            </span>
          ) : null}
        </span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
