import { cn } from "@/lib/utils";
import { InfoTip } from "@/ui/shared/InfoTip";

type InspectorSectionTone = "muted" | "default" | "danger";

type InspectorSectionProps = {
  title: string;
  info?: string;
  tone?: InspectorSectionTone;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

const toneClasses: Record<InspectorSectionTone, string> = {
  muted: "bg-muted/20",
  default: "bg-background",
  danger: "border-destructive/30 bg-destructive/5",
};

export function InspectorSection({
  title,
  info,
  tone = "default",
  action,
  className,
  children,
}: InspectorSectionProps) {
  const titleClassName =
    tone === "danger" ? "text-destructive" : "text-muted-foreground";

  return (
    <section className={cn("space-y-3 rounded-xl border p-3", toneClasses[tone], className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className={cn("text-xs font-semibold uppercase", titleClassName)}>{title}</p>
          {info ? <InfoTip content={info} /> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
