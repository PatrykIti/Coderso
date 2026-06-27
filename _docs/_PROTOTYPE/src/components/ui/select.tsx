import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/cn";

/**
 * Presentational select — styled native <select> so it stays usable and accessible
 * in the prototype. Ports to the Radix-based shadcn Select when wired for real.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex w-full">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full appearance-none rounded-xl border border-input bg-card pl-3 pr-9 text-sm shadow-soft transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);
Select.displayName = "Select";
