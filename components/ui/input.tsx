import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * fieldBase — §10: viền `--input` đạt ≥3:1, focus dùng `ring-2 ring-ring/25`
 * (không outline), `aria-[invalid]` đổi viền sang destructive.
 */
const fieldBase =
  "w-full rounded-md border border-input bg-card text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50 aria-[invalid=true]:border-destructive";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(fieldBase, "h-9 px-3 coarse:h-11", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-20 px-3 py-2", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/** Ô tìm: icon 16px tuyệt đối `left-3`, input `pl-9`, nhãn `sr-only` (§10). */
const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, "aria-label": ariaLabel, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input ref={ref} type="search" className="pl-9" aria-label={ariaLabel ?? "Tìm kiếm"} {...props} />
    </div>
  )
);
SearchInput.displayName = "SearchInput";

export { Input, Textarea, SearchInput, fieldBase };
