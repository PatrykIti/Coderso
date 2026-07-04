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

export function ThemeTemplateCard({ template, onEdit, onDuplicate }: ThemeTemplateCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {template.palette.map((color, index) => (
            <span
              key={`${template.id}-color-${index}`}
              className="size-6 rounded-full border border-border shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <Badge variant="soft" className="text-[10px] uppercase tracking-wide">
          Template
        </Badge>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{template.name}</h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{template.tokenCount} tokens</span>
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
    </Card>
  );
}
