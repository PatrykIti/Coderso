import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * TASK-479-06-L02: rethemed to the soft/violet look — the heading now matches
 * the `SectionCard` header type scale (`font-display text-[15px]`). API
 * unchanged (title/action/className); `title` widened to `ReactNode`.
 */
export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <h2 className="font-display text-[15px] font-semibold">{title}</h2>
      {action}
    </div>
  );
}
