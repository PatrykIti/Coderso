import { Pencil, Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type AdminThemeTemplateCard = {
  id: string;
  name: string;
  description: string;
  palette: string[];
  tokenCount: number;
};

type ThemeTemplateCardProps = {
  template: AdminThemeTemplateCard;
  onEdit?: () => void;
  onDuplicate?: () => void;
};

export function ThemeTemplateCard({
  template,
  onEdit,
  onDuplicate,
}: ThemeTemplateCardProps) {
  return (
    <Card className="gap-0 overflow-hidden border-border/60 p-0 transition-shadow hover:shadow-md">
      <div className="relative border-b bg-muted/40 p-4">
        <div className="flex h-28 w-full flex-col gap-2 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2">
            {template.palette.map((color, index) => (
              <span
                key={`${template.id}-color-${index}`}
                className="h-4 w-4 rounded-full border border-background shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="h-2 w-1/2 rounded bg-muted" />
          <div className="h-2 w-full rounded bg-muted/70" />
        </div>
        <Badge className="absolute right-3 top-3 text-[10px] uppercase tracking-wide">
          Template
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{template.name}</h3>
          <p className="text-xs text-muted-foreground">{template.description}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {template.tokenCount} tokens
          </span>
          <div className="flex items-center gap-1">
            {onEdit ? (
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Edit ${template.name}`}
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {onDuplicate ? (
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Duplicate ${template.name}`}
                onClick={onDuplicate}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
