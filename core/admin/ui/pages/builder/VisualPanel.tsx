import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { WidgetDefinition } from "./types";

export type VisualPanelProps = {
  widget: WidgetDefinition;
  selected?: string;
  onSelect: (variant: string) => void;
};

export function VisualPanel({ widget, selected, onSelect }: VisualPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Visual
        </p>
        <h3 className="text-lg font-semibold">{widget.label} Variants</h3>
        <p className="text-sm text-muted-foreground">
          Choose a visual style for this widget.
        </p>
      </div>
      <div className="grid gap-3">
        {widget.variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => onSelect(variant.id)}
            className={
              selected === variant.id
                ? "rounded-lg border border-primary bg-primary/5 p-3 text-left"
                : "rounded-lg border bg-background p-3 text-left"
            }
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{variant.label}</p>
                {variant.description ? (
                  <p className="text-xs text-muted-foreground">
                    {variant.description}
                  </p>
                ) : null}
              </div>
              <Badge variant={selected === variant.id ? "default" : "outline"}>
                {selected === variant.id ? "Selected" : "Pick"}
              </Badge>
            </div>
          </button>
        ))}
      </div>
      <Button variant="outline" className="w-full">
        Add variant preset
      </Button>
    </div>
  );
}
