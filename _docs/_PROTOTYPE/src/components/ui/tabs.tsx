import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type TabItem = { value: string; label: ReactNode; count?: number };

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  variant = "pill",
}: {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  variant?: "pill" | "underline";
}) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;

  const select = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  if (variant === "underline") {
    return (
      <div className={cn("flex items-center gap-1 border-b border-border", className)}>
        {items.map((item) => {
          const isActive = item.value === active;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => select(item.value)}
              className={cn(
                "relative -mb-px flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {typeof item.count === "number" ? (
                <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                  {item.count}
                </span>
              ) : null}
              {isActive ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 p-1",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => select(item.value)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  isActive ? "bg-primary-soft text-primary-soft-foreground" : "bg-muted",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
