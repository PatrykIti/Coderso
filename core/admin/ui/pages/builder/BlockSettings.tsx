import { Component, type ErrorInfo, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTip } from "@/ui/shared/InfoTip";
import {
  getRepeatableSlotIds,
  getWidgetSlotKind,
  parseRepeatableSlotId,
  resolveWidgetSlotTargets,
} from "../../../../widgets/slots";
import { WidgetRenderer } from "../../../../widgets/renderers/widgetRenderer";

import type {
  Block,
  EditorMode,
  WidgetBlockPatcher,
  WidgetDefinition,
  WidgetEditorContext,
} from "./types";
import { AdvancedPanel } from "./AdvancedPanel";
import { VisualPanel, type VisualPanelSlotControls } from "./VisualPanel";
import { WizardPanel } from "./WizardPanel";
import {
  applySectionRegionLabels,
  resolveSectionRegionLabelValue,
  sectionRegionSlot,
  syncSectionRegionDataWithSlotMap,
  updateSectionRegionLabelData,
  type SectionData,
} from "../../../../widgets/core/section";
import {
  addRepeatableSlotInstanceForWidget,
  applyWidgetBlockPatch,
  applyWizardSelection,
  removeRepeatableSlotInstanceForWidget,
  reorderBlocks,
  reorderRepeatableSlotInstancesForWidget,
} from "./blockUtils";

export type BlockSettingsProps = {
  block?: Block | null;
  widget?: WidgetDefinition;
  onChange: (next: Block) => void;
  onBlockPatch?: WidgetBlockPatcher;
  editorContext?: WidgetEditorContext;
};

type WidgetPreviewErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  resetKey: string;
};

type WidgetPreviewErrorBoundaryState = {
  hasError: boolean;
};

class WidgetPreviewErrorBoundary extends Component<
  WidgetPreviewErrorBoundaryProps,
  WidgetPreviewErrorBoundaryState
> {
  override state: WidgetPreviewErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): WidgetPreviewErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {}

  override componentDidUpdate(prevProps: WidgetPreviewErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function WidgetEditorLivePreview({
  block,
  mode,
  previewState,
}: {
  block: Block;
  mode: EditorMode;
  previewState?: WidgetEditorContext["previewState"];
}) {
  const previewBlock =
    previewState?.dataPatch && block.data && typeof block.data === "object"
      ? {
          ...block,
          data: {
            ...(block.data as Record<string, unknown>),
            ...previewState.dataPatch,
          },
        }
      : block;

  const statusLabel =
    previewState?.status === "loading"
      ? "Refreshing preview"
      : previewState?.status === "error"
        ? "Preview error"
        : previewState?.status === "ready"
          ? "Preview ready"
          : "Live preview";

  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const previewResetKey = JSON.stringify({
    blockId: block.id,
    mode,
    status: previewState?.status ?? null,
    message: previewState?.message ?? null,
    data: previewBlock.data ?? null,
  });

  return (
    <section
      className="mt-4 rounded-lg border bg-muted/5 p-3"
      data-widget-editor-live-preview="true"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{statusLabel}</p>
          <p className="text-xs text-muted-foreground">
            Reflects the current {modeLabel} state through the shared widget renderer.
          </p>
          {previewState?.message ? (
            <p className="text-xs text-muted-foreground">{previewState.message}</p>
          ) : null}
        </div>
      </div>
      <div className="rounded-md border bg-background p-3">
        <WidgetPreviewErrorBoundary
          resetKey={previewResetKey}
          fallback={
            <div
              className="rounded-md border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground"
              data-widget-editor-live-preview-error="true"
            >
              <p className="font-medium text-foreground">Preview unavailable</p>
              <p className="mt-1">
                The shared widget preview hit a render error. Keep editing and update the widget
                state to retry.
              </p>
            </div>
          }
        >
          <WidgetRenderer
            block={previewBlock}
            renderContext={{ mode: "editor-preview", previewState: previewState ?? null }}
          />
        </WidgetPreviewErrorBoundary>
      </div>
    </section>
  );
}

export function BlockSettings({
  block,
  widget,
  onChange,
  onBlockPatch,
  editorContext,
}: BlockSettingsProps) {
  if (!block || !widget) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Select a block to edit its settings.
      </div>
    );
  }

  const getSlotMap = (value: Block) =>
    value.slots && typeof value.slots === "object" && !Array.isArray(value.slots)
      ? (value.slots as Record<string, Block[]>)
      : Array.isArray(value.children)
        ? { default: value.children }
        : {};

  const editorState = block.editor ?? { mode: "wizard", wizardCompleted: false };
  const slotMap = getSlotMap(block);
  const slotDefinitions = widget.slots ?? [];
  const rawSlotTargets = resolveWidgetSlotTargets(slotDefinitions, slotMap);
  const slotTargets =
    widget.type === "section"
      ? applySectionRegionLabels(rawSlotTargets, block.data as SectionData | undefined)
      : rawSlotTargets;
  const supportsSlots = slotTargets.length > 0;
  const repeatableSlotDefinitions = slotDefinitions.filter(
    (slot) => getWidgetSlotKind(slot) === "repeatable"
  );
  const nestedCount = Object.values(slotMap).reduce(
    (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
    0
  );
  const patchBlock =
    onBlockPatch ??
    ((patch) => {
      onChange(applyWidgetBlockPatch(block, patch));
    });
  const supportsChildren = Boolean(widget.canHaveChildren);
  const slotControlSection = widget.editorCapabilities?.slotControlSection;
  const resolvedEditorContext = editorContext
    ? {
        ...editorContext,
        slotTargets,
      }
    : undefined;
  const showLivePreview = resolvedEditorContext?.surface === "page-builder";
  const syncSectionRegionBlock = (nextBlock: Block) =>
    nextBlock.type === "section"
      ? {
          ...nextBlock,
          data: syncSectionRegionDataWithSlotMap(
            nextBlock.data as SectionData | undefined,
            getSlotMap(nextBlock)
          ),
        }
      : nextBlock;

  const handleAddRepeatableSlotInstance = (definitionId: string) => {
    const definition = slotDefinitions.find((slot) => slot.id === definitionId);
    if (!definition || getWidgetSlotKind(definition) !== "repeatable") return;
    const existing = getRepeatableSlotIds(definition, slotMap);
    const maximum = Number.isFinite(definition.maxItems)
      ? Math.max(0, Math.floor(definition.maxItems ?? 0))
      : undefined;
    if (typeof maximum === "number" && existing.length >= maximum) return;

    patchBlock((current) =>
      syncSectionRegionBlock(addRepeatableSlotInstanceForWidget(current, widget, definitionId))
    );
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

    patchBlock((current) =>
      syncSectionRegionBlock(removeRepeatableSlotInstanceForWidget(current, widget, slotId))
    );
  };

  const handleReorderRepeatableSlotInstances = (
    definitionId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    const definition = slotDefinitions.find((slot) => slot.id === definitionId);
    if (!definition || getWidgetSlotKind(definition) !== "repeatable") return;
    const currentIds = getRepeatableSlotIds(definition, slotMap)
      .map((slotId) => parseRepeatableSlotId(slotId)?.instanceId ?? null)
      .filter((instanceId): instanceId is string => Boolean(instanceId));
    const nextIds = reorderBlocks(currentIds, fromIndex, toIndex);
    if (nextIds === currentIds) return;
    patchBlock((current) =>
      syncSectionRegionBlock(
        reorderRepeatableSlotInstancesForWidget(current, widget, definitionId, nextIds)
      )
    );
  };

  const slotControls: VisualPanelSlotControls | undefined =
    supportsSlots || supportsChildren
      ? {
          sectionId: slotControlSection?.id ?? `${widget.type}.structure`,
          title: slotControlSection?.title ?? "Structure",
          description:
            slotControlSection?.description ??
            (supportsSlots
              ? "Manage fixed and repeatable slots without leaving the Visual editor."
              : "Use the canvas and insert dialog to manage nested content."),
          addActions: repeatableSlotDefinitions.map((slot) => {
            const count = getRepeatableSlotIds(slot, slotMap).length;
            const maximum = Number.isFinite(slot.maxItems)
              ? Math.max(0, Math.floor(slot.maxItems ?? 0))
              : undefined;
            return {
              id: `add-${slot.id}`,
              label: `Add ${slot.label}`,
              disabled: typeof maximum === "number" && count >= maximum,
              onClick: () => handleAddRepeatableSlotInstance(slot.id),
            };
          }),
          items: slotTargets.map((slot, index) => {
            const rawSlot = rawSlotTargets[index] ?? slot;
            const count = Array.isArray(slotMap[slot.slotId]) ? slotMap[slot.slotId].length : 0;
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
            const repeatableSlotIds =
              repeatableDefinition && slot.kind === "repeatable"
                ? getRepeatableSlotIds(repeatableDefinition, slotMap)
                : [];
            const repeatableIndex =
              slot.kind === "repeatable" ? repeatableSlotIds.indexOf(slot.slotId) : -1;
            const canRemoveRepeatable =
              slot.kind === "repeatable" &&
              repeatableDefinition &&
              repeatableCount > repeatableMinimum;
            const isSectionRegion =
              widget.type === "section" && slot.definitionId === sectionRegionSlot.id;
            return {
              id: `${widget.type}.slot.${slot.slotId}`,
              label: `${slot.label} slot`,
              labelValue: isSectionRegion
                ? resolveSectionRegionLabelValue(
                    block.data as SectionData | undefined,
                    slot.slotId,
                    slot.instanceId
                  )
                : undefined,
              labelPlaceholder: isSectionRegion ? rawSlot.label : undefined,
              onLabelChange: isSectionRegion
                ? (nextLabel: string) =>
                    patchBlock((current) => ({
                      ...current,
                      data: updateSectionRegionLabelData(
                        syncSectionRegionDataWithSlotMap(
                          current.data as SectionData | undefined,
                          getSlotMap(current)
                        ),
                        slot.slotId,
                        nextLabel
                      ),
                    }))
                : undefined,
              count,
              empty: count === 0,
              canRemove: Boolean(canRemoveRepeatable),
              onRemove: canRemoveRepeatable
                ? () => handleRemoveRepeatableSlotInstance(slot.slotId)
                : undefined,
              canMoveUp: slot.kind === "repeatable" && repeatableIndex > 0,
              canMoveDown:
                slot.kind === "repeatable" &&
                repeatableIndex >= 0 &&
                repeatableIndex < repeatableSlotIds.length - 1,
              onMoveUp:
                slot.kind === "repeatable" && repeatableIndex > 0
                  ? () =>
                      handleReorderRepeatableSlotInstances(
                        slot.definitionId,
                        repeatableIndex,
                        repeatableIndex - 1
                      )
                  : undefined,
              onMoveDown:
                slot.kind === "repeatable" &&
                repeatableIndex >= 0 &&
                repeatableIndex < repeatableSlotIds.length - 1
                  ? () =>
                      handleReorderRepeatableSlotInstances(
                        slot.definitionId,
                        repeatableIndex,
                        repeatableIndex + 1
                      )
                  : undefined,
            };
          }),
          childrenHint: supportsSlots
            ? "Use the slot add action in the canvas or drag from the widgets tab to place widgets into a slot."
            : `Nested blocks: ${nestedCount}. Use the Insert dialog to add widgets inside this block.`,
        }
      : undefined;

  if (!editorState.wizardCompleted) {
    return (
      <>
        <WizardPanel
          widget={widget}
          block={block}
          onChange={onChange}
          onBlockPatch={patchBlock}
          onComplete={() => onChange(applyWizardSelection(block))}
          editorContext={resolvedEditorContext}
        />
        {showLivePreview ? (
          <WidgetEditorLivePreview
            block={block}
            mode={editorState.mode}
            previewState={resolvedEditorContext?.previewState}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 rounded-lg border bg-muted/10 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Selected widget
            </p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{widget.title}</h3>
              <Badge variant="outline" className="text-[10px] uppercase">
                {widget.type}
              </Badge>
            </div>
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
      <Tabs
        value={editorState.mode}
        onValueChange={(mode) =>
          patchBlock((current) => ({
            ...current,
            editor: { ...(current.editor ?? editorState), mode: mode as EditorMode },
          }))
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
            onBlockPatch={patchBlock}
            onComplete={() => onChange(applyWizardSelection(block))}
            editorContext={resolvedEditorContext}
          />
        </TabsContent>
        <TabsContent value="visual">
          <VisualPanel
            widget={widget}
            block={block}
            onChange={onChange}
            onBlockPatch={patchBlock}
            editorContext={resolvedEditorContext}
            slotControls={slotControls}
          />
        </TabsContent>
        <TabsContent value="advanced">
          <AdvancedPanel
            block={block}
            widget={widget}
            onChange={onChange}
            onBlockPatch={patchBlock}
            editorContext={resolvedEditorContext}
          />
        </TabsContent>
      </Tabs>
      {showLivePreview ? (
        <WidgetEditorLivePreview
          block={block}
          mode={editorState.mode}
          previewState={resolvedEditorContext?.previewState}
        />
      ) : null}
    </>
  );
}
