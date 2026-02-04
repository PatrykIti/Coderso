import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type InfoTipProps = {
  content: ReactNode;
  label?: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

export function InfoTip({
  content,
  label = "Info",
  side = "top",
  className,
}: InfoTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={6} className="max-w-[220px] text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
