import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDown, GripVertical } from "lucide-react";

import { FieldSettings, type FieldSettingsProps } from "./FieldSettings";

export type FieldCardProps = {
  name: string;
  typeLabel: string;
  description?: string;
  meta?: string;
  badges?: string[];
  icon: ReactNode;
  expanded?: boolean;
  settings: FieldSettingsProps;
};

export function FieldCard({
  name,
  typeLabel,
  description,
  meta,
  badges,
  icon,
  expanded = false,
  settings,
}: FieldCardProps) {
  return (
    <Card
      className={cn(
        "border-border/70 bg-background shadow-sm",
        expanded && "border-primary/40"
      )}
    >
      <Collapsible defaultOpen={expanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="rounded-md p-1 text-muted-foreground transition hover:text-foreground">
                    <GripVertical className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Drag to reorder</TooltipContent>
              </Tooltip>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                  <Badge
                    variant="secondary"
                    className="px-2 text-[10px] font-mono uppercase tracking-wide"
                  >
                    {typeLabel}
                  </Badge>
                </div>
                {description ? (
                  <p className="text-xs text-muted-foreground">{description}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {badges && badges.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {badges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="outline"
                      className="text-[10px] uppercase"
                    >
                      {badge}
                    </Badge>
                  ))}
                </div>
              ) : meta ? (
                <span className="text-xs text-muted-foreground">{meta}</span>
              ) : null}
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t bg-muted/30 px-4 py-5">
          <FieldSettings {...settings} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
