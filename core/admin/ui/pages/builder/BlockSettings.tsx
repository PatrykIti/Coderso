import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveWidgetSlotTargets } from "../../../../widgets/slots";

import type { Block, EditorMode, WidgetDefinition } from "./types";
import { AdvancedPanel } from "./AdvancedPanel";
import { VisualPanel } from "./VisualPanel";
import { WizardPanel } from "./WizardPanel";
import { applyWizardSelection } from "./blockUtils";

export type BlockSettingsProps = {
  block?: Block | null;
  widget?: WidgetDefinition;
  onChange: (next: Block) => void;
};

export function BlockSettings({ block, widget, onChange }: BlockSettingsProps) {
  if (!block || !widget) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Select a block to edit its settings.
      </div>
    );
  }

  const editorState = block.editor ?? { mode: "wizard", wizardCompleted: false };
  const slotMap =
    block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)
      ? (block.slots as Record<string, Block[]>)
      : Array.isArray(block.children)
        ? { default: block.children }
        : {};
  const slotDefinitions = widget.slots ?? [];
  const slotTargets = resolveWidgetSlotTargets(slotDefinitions, slotMap);
  const supportsSlots = slotTargets.length > 0;
  const nestedCount = Object.values(slotMap).reduce(
    (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
    0
  );
  const supportsChildren = Boolean(widget.canHaveChildren);

  if (!editorState.wizardCompleted) {
    return (
      <WizardPanel
        widget={widget}
        block={block}
        onChange={onChange}
        onComplete={() => onChange(applyWizardSelection(block))}
      />
    );
  }

  return (
    <>
      {supportsSlots ? (
        <div className="mb-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          Slots:
          <div className="mt-2 space-y-1">
            {slotTargets.map((slot) => {
              const count = Array.isArray(slotMap[slot.slotId])
                ? slotMap[slot.slotId].length
                : 0;
              return (
                <div key={slot.slotId} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span>{slot.label} slot</span>
                    <span>
                      {count} {count === 1 ? "item" : "items"}
                    </span>
                  </div>
                  {count === 0 ? (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Slot is available and currently empty.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-2">
            Use the Insert dialog to add widgets into a slot.
          </div>
        </div>
      ) : supportsChildren ? (
        <div className="mb-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          Nested blocks: {nestedCount}. Use the Insert dialog to add widgets inside
          this block.
        </div>
      ) : null}
      <Tabs
        value={editorState.mode}
        onValueChange={(mode) =>
          onChange({
            ...block,
            editor: { ...editorState, mode: mode as EditorMode },
          })
        }
        className="gap-4"
      >
      <TabsList variant="line">
        <TabsTrigger value="wizard">Wizard</TabsTrigger>
        <TabsTrigger value="visual">Visual</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>
      <TabsContent value="wizard">
        <WizardPanel
          widget={widget}
          block={block}
          onChange={onChange}
          onComplete={() => onChange(applyWizardSelection(block))}
        />
      </TabsContent>
      <TabsContent value="visual">
        <VisualPanel widget={widget} block={block} onChange={onChange} />
      </TabsContent>
      <TabsContent value="advanced">
        <AdvancedPanel block={block} widget={widget} onChange={onChange} />
      </TabsContent>
      </Tabs>
    </>
  );
}
