import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function SectionCard({
  title,
  description,
  action,
  icon,
  children,
  className,
  bodyClassName,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {title || action ? (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon ? (
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <div className="font-display text-[15px] font-semibold">{title}</div> : null}
              {description ? (
                <div className="text-sm text-muted-foreground">{description}</div>
              ) : null}
            </div>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(padded && "p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}
