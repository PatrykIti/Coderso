import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { Block, WidgetDefinition } from "./types";

export type WizardPanelProps = {
  widget: WidgetDefinition;
  block: Block;
  onComplete: (variant: string) => void;
};

export function WizardPanel({ widget, block, onComplete }: WizardPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Wizard
        </p>
        <h3 className="text-lg font-semibold">{widget.label}</h3>
        <p className="text-sm text-muted-foreground">{widget.wizard.prompt}</p>
      </div>
      <div className="grid gap-3">
        {widget.wizard.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onComplete(option.id)}
            className="rounded-lg border bg-muted/20 p-3 text-left transition hover:border-primary"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{option.label}</p>
                {option.description ? (
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                ) : null}
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">
                {block.type}
              </Badge>
            </div>
          </button>
        ))}
      </div>
      <Button className="w-full" onClick={() => onComplete(widget.variants[0].id)}>
        Complete setup
      </Button>
    </div>
  );
}
