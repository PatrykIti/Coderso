import { type ReactNode } from "react";

import { cn } from "@/lib/cn";

/** CSS-only hover tooltip — keeps the prototype dependency-free. */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-pop transition-opacity group-hover/tt:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
}
