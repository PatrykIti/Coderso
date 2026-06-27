import { cn } from "@/lib/cn";

export function Progress({
  value = 0,
  className,
  tone = "primary",
}: {
  value?: number;
  className?: string;
  tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const tones = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  } as const;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
