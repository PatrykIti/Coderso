import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildRepeatableSlotId,
  getNextRepeatableSlotInstanceId,
  getRepeatableSlotIds,
  getWidgetSlotKind,
  parseRepeatableSlotId,
  resolveWidgetSlotTargets,
} from "../../../../widgets/slots";

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
  const repeatableSlotDefinitions = slotDefinitions.filter(
    (slot) => getWidgetSlotKind(slot) === "repeatable"
  );
  const nestedCount = Object.values(slotMap).reduce(
    (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
    0
  );
  const supportsChildren = Boolean(widget.canHaveChildren);

  const handleAddRepeatableSlotInstance = (definitionId: string) => {
    const definition = slotDefinitions.find((slot) => slot.id === definitionId);
    if (!definition || getWidgetSlotKind(definition) !== "repeatable") return;
    const existing = getRepeatableSlotIds(definition, slotMap);
    const maximum = Number.isFinite(definition.maxItems)
      ? Math.max(0, Math.floor(definition.maxItems ?? 0))
      : undefined;
    if (typeof maximum === "number" && existing.length >= maximum) return;

    const nextInstanceId = getNextRepeatableSlotInstanceId(definitionId, slotMap);
    const nextSlotId = buildRepeatableSlotId(definitionId, nextInstanceId);
    onChange({
      ...block,
      slots: {
        ...slotMap,
        [nextSlotId]: [],
      },
      children: undefined,
    });
  };

  const handleRemoveRepeatableSlotInstance = (slotId: string) => {
    const parsed = parseRepeatableSlotId(slotId);
    if (!parsed) return;
    const definition = slotDefinitions.find((slot) => slot.id === parsed.definitionId);
    if (!definition || getWidgetSlotKind(definition) !== "repeatable") return;

    const existing = getRepeatableSlotIds(definition, slotMap);
    const minimum = Number.isFinite(definition.minItems)
      ? Math.max(0, Math.floor(definition.minItems ?? 0))
      : 0;
    if (existing.length <= minimum) return;
    if (!(slotId in slotMap)) return;

    const nextSlots = { ...slotMap };
    delete nextSlots[slotId];
    onChange({
      ...block,
      slots: nextSlots,
      children: undefined,
    });
  };

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
          {repeatableSlotDefinitions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {repeatableSlotDefinitions.map((slot) => {
                const count = getRepeatableSlotIds(slot, slotMap).length;
                const maximum = Number.isFinite(slot.maxItems)
                  ? Math.max(0, Math.floor(slot.maxItems ?? 0))
                  : undefined;
                const disabled = typeof maximum === "number" && count >= maximum;
                return (
                  <Button
                    key={`add-repeatable-${slot.id}`}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => handleAddRepeatableSlotInstance(slot.id)}
                    className="h-7 px-2 text-[11px]"
                  >
                    Add {slot.label}
                  </Button>
                );
              })}
            </div>
          ) : null}
          <div className="mt-2 space-y-1">
            {slotTargets.map((slot) => {
              const count = Array.isArray(slotMap[slot.slotId])
                ? slotMap[slot.slotId].length
                : 0;
              const repeatableDefinition =
                slot.kind === "repeatable"
                  ? slotDefinitions.find((definition) => definition.id === slot.definitionId)
                  : undefined;
              const repeatableCount =
                repeatableDefinition && slot.kind === "repeatable"
                  ? getRepeatableSlotIds(repeatableDefinition, slotMap).length
                  : 0;
              const repeatableMinimum =
                repeatableDefinition && Number.isFinite(repeatableDefinition.minItems)
                  ? Math.max(0, Math.floor(repeatableDefinition.minItems ?? 0))
                  : 0;
              const canRemoveRepeatable =
                slot.kind === "repeatable" &&
                repeatableDefinition &&
                repeatableCount > repeatableMinimum;
              return (
                <div key={slot.slotId} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span>{slot.label} slot</span>
                    <div className="flex items-center gap-2">
                      <span>
                        {count} {count === 1 ? "item" : "items"}
                      </span>
                      {canRemoveRepeatable ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleRemoveRepeatableSlotInstance(slot.slotId)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
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
