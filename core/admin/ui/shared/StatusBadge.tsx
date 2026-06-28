import { type VariantProps } from "class-variance-authority";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * TASK-479-06-L02: domain-status → badge mapping ported from the prototype
 * (`patterns/StatusBadge.tsx`) onto the L01 Badge variants
 * (`soft`/`success`/`warning`/`info`). The canonical keys mirror the real core
 * enums so screen leaves (479-07..29) and TASK-480 share one badge:
 *   - page/post/entry: draft | published | scheduled | archived
 *   - review:          pending | approved | rejected | spam
 *   - commerce:        published | draft | archived
 * The prototype's fictional `review` status key is dropped (no real enum);
 * generic descriptive keys (active/live/paid/beta/…) are preserved.
 */
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const MAP: Record<string, { variant: BadgeVariant; dot: string; label?: string }> = {
  published: { variant: "success", dot: "bg-success" },
  active: { variant: "success", dot: "bg-success" },
  live: { variant: "success", dot: "bg-success" },
  approved: { variant: "success", dot: "bg-success" },
  paid: { variant: "success", dot: "bg-success" },
  online: { variant: "success", dot: "bg-success" },
  completed: { variant: "success", dot: "bg-success" },
  draft: { variant: "secondary", dot: "bg-muted-foreground" },
  inactive: { variant: "secondary", dot: "bg-muted-foreground" },
  archived: { variant: "secondary", dot: "bg-muted-foreground" },
  scheduled: { variant: "info", dot: "bg-info" },
  planned: { variant: "info", dot: "bg-info" },
  lead: { variant: "info", dot: "bg-info" },
  open: { variant: "info", dot: "bg-info" },
  new: { variant: "info", dot: "bg-info" },
  pending: { variant: "warning", dot: "bg-warning" },
  processing: { variant: "warning", dot: "bg-warning" },
  "on hold": { variant: "warning", dot: "bg-warning" },
  "on-hold": { variant: "warning", dot: "bg-warning" },
  beta: { variant: "soft", dot: "bg-primary" },
  preview: { variant: "soft", dot: "bg-primary" },
  overdue: { variant: "destructive", dot: "bg-destructive" },
  churned: { variant: "destructive", dot: "bg-destructive" },
  failed: { variant: "destructive", dot: "bg-destructive" },
  error: { variant: "destructive", dot: "bg-destructive" },
  rejected: { variant: "destructive", dot: "bg-destructive" },
  spam: { variant: "destructive", dot: "bg-destructive" },
  blocked: { variant: "destructive", dot: "bg-destructive" },
  suspended: { variant: "destructive", dot: "bg-destructive" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  const config = MAP[key] ?? { variant: "outline" as const, dot: "bg-muted-foreground" };
  return (
    <Badge variant={config.variant} className={cn("capitalize", className)}>
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label ?? status}
    </Badge>
  );
}
