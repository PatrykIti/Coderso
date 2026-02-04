import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const supportsSlots = slotDefinitions.length > 0;
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
            {slotDefinitions.map((slot) => {
              const count = Array.isArray(slotMap[slot.id])
                ? slotMap[slot.id].length
                : 0;
              return (
                <div key={slot.id} className="flex items-center justify-between">
                  <span>{slot.label}</span>
                  <span>{count}</span>
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
