import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Block, WidgetDefinition, WidgetEditorContext } from "./types";

export type VisualPanelProps = {
  widget: WidgetDefinition;
  block: Block;
  onChange: (next: Block) => void;
  editorContext?: WidgetEditorContext;
};

export function VisualPanel({ widget, block, onChange, editorContext }: VisualPanelProps) {
  const variant = block.variant ?? widget.variants[0]?.id ?? "";
  const Editor = widget.editor.visual;
  const visualOwnsVariantSelection = Boolean(widget.editorCapabilities?.visualOwnsVariantSelection);

  return (
    <div className="space-y-4">
      {!visualOwnsVariantSelection ? (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Visual
            </p>
            <h3 className="text-lg font-semibold">{widget.title} Variants</h3>
            <p className="text-sm text-muted-foreground">Choose a visual style for this widget.</p>
          </div>
          <div className="grid gap-3">
            {widget.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => onChange({ ...block, variant: variant.id })}
                className={
                  block.variant === variant.id
                    ? "rounded-lg border border-primary bg-primary/5 p-3 text-left"
                    : "rounded-lg border bg-background p-3 text-left"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{variant.label}</p>
                    {variant.description ? (
                      <p className="text-xs text-muted-foreground">{variant.description}</p>
                    ) : null}
                  </div>
                  <Badge variant={block.variant === variant.id ? "default" : "outline"}>
                    {block.variant === variant.id ? "Selected" : "Pick"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
          <Button variant="outline" className="w-full">
            Add variant preset
          </Button>
        </>
      ) : null}
      <Editor
        value={block.data as Record<string, unknown>}
        onChange={(data) => onChange({ ...block, data })}
        variant={variant}
        onVariantChange={(next) => onChange({ ...block, variant: next })}
        context={editorContext}
      />
    </div>
  );
}
