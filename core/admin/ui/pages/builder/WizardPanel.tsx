import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { Block, WidgetDefinition, WidgetEditorContext } from "./types";
import { applyWidgetBlockPatch } from "./blockUtils";
import { InfoTip } from "../../shared/InfoTip";
import { WidgetEditorModeRoot } from "../../widgets/editors/WidgetEditorControls";
import { WidgetEditorOutlet } from "../../widgets/WidgetEditorOutlet";

export type WizardPanelProps = {
  widget: WidgetDefinition;
  block: Block;
  onChange: (next: Block) => void;
  onBlockPatch?: (patch: Parameters<typeof applyWidgetBlockPatch>[1]) => void;
  onComplete: () => void;
  editorContext?: WidgetEditorContext;
};

export function WizardPanel({
  widget,
  block,
  onChange,
  onBlockPatch,
  onComplete,
  editorContext,
}: WizardPanelProps) {
  const variant = block.variant ?? widget.variants[0]?.id ?? "";
  const patchBlock =
    onBlockPatch ??
    ((patch: Parameters<typeof applyWidgetBlockPatch>[1]) => {
      onChange(applyWidgetBlockPatch(block, patch));
    });

  return (
    <WidgetEditorModeRoot widgetType={widget.type} mode="wizard">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Wizard
            </p>
            <h3 className="text-lg font-semibold">{widget.title}</h3>
          </div>
          {widget.description ? (
            <InfoTip
              content={widget.description}
              label={`${widget.title} widget information`}
              side="left"
            />
          ) : null}
        </div>
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
      <WidgetEditorOutlet
        definition={widget}
        mode="wizard"
        value={block.data as Record<string, unknown>}
        onChange={(data) =>
          patchBlock((current) => ({
            ...current,
            data,
          }))
        }
        variant={variant}
        onVariantChange={(next) => patchBlock({ variant: next })}
        onBlockPatch={patchBlock}
        context={editorContext}
      />
      <Button className="w-full" onClick={onComplete}>
        Finish setup and open Visual
      </Button>
    </WidgetEditorModeRoot>
  );
}
