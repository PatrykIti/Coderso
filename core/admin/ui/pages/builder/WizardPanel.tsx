import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { Block, WidgetDefinition } from "./types";

export type WizardPanelProps = {
  widget: WidgetDefinition;
  block: Block;
  onChange: (next: Block) => void;
  onComplete: () => void;
};

export function WizardPanel({ widget, block, onChange, onComplete }: WizardPanelProps) {
  const Editor = widget.editor.wizard;
  const variant = block.variant ?? widget.variants[0]?.id ?? "";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Wizard
        </p>
        <h3 className="text-lg font-semibold">{widget.title}</h3>
        {widget.description ? (
          <p className="text-sm text-muted-foreground">{widget.description}</p>
        ) : null}
      </div>
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Widget type
          </p>
          <Badge variant="outline" className="text-[10px] uppercase">
            {block.type}
          </Badge>
        </div>
      </div>
      <Editor
        value={block.data as Record<string, unknown>}
        onChange={(data) => onChange({ ...block, data })}
        variant={variant}
        onVariantChange={(next) => onChange({ ...block, variant: next })}
      />
      <Button className="w-full" onClick={onComplete}>
        Complete setup
      </Button>
    </div>
  );
}
