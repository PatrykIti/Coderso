import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Block, WidgetDefinition, WidgetEditorContext } from "./types";
import { applyWidgetBlockPatch } from "./blockUtils";
import {
  WidgetEditorModeRoot,
  WidgetEditorSection,
} from "../../widgets/editors/WidgetEditorControls";

export type VisualPanelSlotControlItem = {
  id: string;
  label: string;
  count: number;
  empty: boolean;
  canRemove: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export type VisualPanelSlotControls = {
  sectionId: string;
  title: string;
  description?: string;
  items: VisualPanelSlotControlItem[];
  addActions: Array<{
    id: string;
    label: string;
    disabled: boolean;
    onClick: () => void;
  }>;
  childrenHint?: string;
};

export type VisualPanelProps = {
  widget: WidgetDefinition;
  block: Block;
  onChange: (next: Block) => void;
  onBlockPatch?: Parameters<typeof applyWidgetBlockPatch>[1] extends never
    ? never
    : (patch: Parameters<typeof applyWidgetBlockPatch>[1]) => void;
  editorContext?: WidgetEditorContext;
  slotControls?: VisualPanelSlotControls;
};

export function VisualPanel({
  widget,
  block,
  onChange,
  onBlockPatch,
  editorContext,
  slotControls,
}: VisualPanelProps) {
  const variant = block.variant ?? widget.variants[0]?.id ?? "";
  const Editor = widget.editor.visual;
  const visualOwnsVariantSelection = Boolean(widget.editorCapabilities?.visualOwnsVariantSelection);
  const patchBlock =
    onBlockPatch ??
    ((patch: Parameters<typeof applyWidgetBlockPatch>[1]) => {
      onChange(applyWidgetBlockPatch(block, patch));
    });

  return (
    <WidgetEditorModeRoot widgetType={widget.type} mode="visual">
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
                onClick={() => patchBlock({ variant: variant.id })}
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
      {slotControls ? (
        <WidgetEditorSection
          id={slotControls.sectionId}
          title={slotControls.title}
          description={slotControls.description}
        >
          {slotControls.addActions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {slotControls.addActions.map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className="h-8 px-2 text-[11px]"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            {slotControls.items.map((item) => (
              <div
                key={item.id}
                data-widget-control={item.id}
                className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {item.count} {item.count === 1 ? "item" : "items"}
                    </span>
                    {typeof item.canMoveUp === "boolean" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={item.onMoveUp}
                        disabled={!item.canMoveUp}
                      >
                        Move up
                      </Button>
                    ) : null}
                    {typeof item.canMoveDown === "boolean" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={item.onMoveDown}
                        disabled={!item.canMoveDown}
                      >
                        Move down
                      </Button>
                    ) : null}
                    {item.canRemove && item.onRemove ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={item.onRemove}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                {item.empty ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Slot is available and currently empty. Use the slot add action in the canvas or
                    drag from the widgets tab.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {slotControls.childrenHint ? (
            <p className="text-xs text-muted-foreground">{slotControls.childrenHint}</p>
          ) : null}
        </WidgetEditorSection>
      ) : null}
    </WidgetEditorModeRoot>
  );
}
