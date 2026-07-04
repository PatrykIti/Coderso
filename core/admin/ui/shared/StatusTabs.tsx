import { type ReactNode } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * TASK-479-06-L02: shared status-filter tabs (no prototype source) built on the
 * L01 `Tabs` `line` variant. Presentational — the active status is controlled
 * by the caller via `value` + `onValueChange` (e.g. a page list filtering by
 * All / Published / Draft / Scheduled / Archived with counts). Used by screen
 * leaves (479-08 page/post lists, etc.).
 */
export type StatusTab = { value: string; label: ReactNode; count?: number };

export function StatusTabs({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: StatusTab[];
  value: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("w-full", className)}>
      <TabsList variant="line" className="flex-wrap">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="group/statustab gap-1.5">
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground group-data-[state=active]/statustab:bg-primary-soft group-data-[state=active]/statustab:text-primary-soft-foreground">
                {tab.count}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
