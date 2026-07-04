import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const MAP: Record<string, { variant: BadgeProps["variant"]; dot: string; label?: string }> = {
  published: { variant: "success", dot: "bg-success" },
  active: { variant: "success", dot: "bg-success" },
  live: { variant: "success", dot: "bg-success" },
  approved: { variant: "success", dot: "bg-success" },
  paid: { variant: "success", dot: "bg-success" },
  online: { variant: "success", dot: "bg-success" },
  draft: { variant: "secondary", dot: "bg-muted-foreground" },
  inactive: { variant: "secondary", dot: "bg-muted-foreground" },
  archived: { variant: "secondary", dot: "bg-muted-foreground" },
  scheduled: { variant: "info", dot: "bg-info" },
  pending: { variant: "warning", dot: "bg-warning" },
  review: { variant: "warning", dot: "bg-warning" },
  processing: { variant: "warning", dot: "bg-warning" },
  beta: { variant: "soft", dot: "bg-primary" },
  preview: { variant: "soft", dot: "bg-primary" },
  completed: { variant: "success", dot: "bg-success" },
  planned: { variant: "info", dot: "bg-info" },
  lead: { variant: "info", dot: "bg-info" },
  "on hold": { variant: "warning", dot: "bg-warning" },
  "on-hold": { variant: "warning", dot: "bg-warning" },
  open: { variant: "info", dot: "bg-info" },
  new: { variant: "info", dot: "bg-info" },
  overdue: { variant: "destructive", dot: "bg-destructive" },
  churned: { variant: "destructive", dot: "bg-destructive" },
  failed: { variant: "destructive", dot: "bg-destructive" },
  error: { variant: "destructive", dot: "bg-destructive" },
  rejected: { variant: "destructive", dot: "bg-destructive" },
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
