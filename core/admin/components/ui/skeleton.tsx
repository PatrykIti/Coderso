import * as React from "react";

import { cn } from "@/lib/utils";

// TASK-479-06-L01: base skeleton primitive ported from the prototype
// (_docs/_PROTOTYPE/src/components/ui/skeleton.tsx). Soft pulse on a muted
// surface with rounded corners; L02's ListSkeleton/FormTableSkeleton compose it.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
