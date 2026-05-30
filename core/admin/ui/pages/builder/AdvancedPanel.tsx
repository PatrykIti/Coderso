import type { Block, WidgetDefinition, WidgetEditorContext, WidgetLayoutDefaults } from "./types";
import {
  applyWidgetBlockPatch,
  resolveSharedBlockLayoutState,
  resolveSharedBlockVisibilityState,
  type SharedBlockValueState,
} from "./blockUtils";
import {
  ReadonlyWidgetSummaryRow,
  WidgetEditorModeRoot,
  WidgetEditorSection,
} from "../../widgets/editors/WidgetEditorControls";

const spacingLabel = (value: string) => (value === "none" ? "None" : value.toUpperCase());

const formatSharedValue = <Saved extends string, Effective extends string>(
  state: SharedBlockValueState<Saved, Effective>,
  label: (value: Effective | Saved) => string
) =>
  state.source === "inherited"
    ? `Inherit page default (${label(state.effective)})`
    : label(state.saved);

export type AdvancedPanelProps = {
  block: Block;
  widget: WidgetDefinition;
  onChange: (next: Block) => void;
  onBlockPatch?: (patch: Parameters<typeof applyWidgetBlockPatch>[1]) => void;
  editorContext?: WidgetEditorContext;
  pageDefaults?: WidgetLayoutDefaults;
};

export function AdvancedPanel({
  block,
  widget,
  onChange,
  onBlockPatch,
  editorContext,
  pageDefaults,
}: AdvancedPanelProps) {
  const Editor = widget.editor.advanced;
  const layoutState = resolveSharedBlockLayoutState(block.layout, pageDefaults);
  const visibilityState = resolveSharedBlockVisibilityState(block.visibility);
  const patchBlock =
    onBlockPatch ??
    ((patch: Parameters<typeof applyWidgetBlockPatch>[1]) => {
      onChange(applyWidgetBlockPatch(block, patch));
    });

  return (
    <WidgetEditorModeRoot widgetType={widget.type} mode="advanced" className="space-y-6">
      <Editor
        value={block.data as Record<string, unknown>}
        onChange={(data) =>
          patchBlock((current) => ({
            ...current,
            data,
          }))
        }
        variant={block.variant ?? widget.variants[0]?.id ?? ""}
        onVariantChange={(next) => patchBlock({ variant: next })}
        onBlockPatch={patchBlock}
        context={editorContext}
      />
      <WidgetEditorSection
        id="builder.advanced.block-layout-summary"
        mode="advanced"
        role="summary"
        title="Block layout summary"
        description="Read-only outer block placement. Change daily layout in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="builder.advanced.layout.container"
          label="Content width"
          path="layout.container"
          value={formatSharedValue(layoutState.container, (value) => value)}
        />
        <ReadonlyWidgetSummaryRow
          id="builder.advanced.layout.padding"
          label="Padding"
          path="layout.padding"
          value={`Top ${formatSharedValue(layoutState.padding.top, spacingLabel)}, bottom ${formatSharedValue(
            layoutState.padding.bottom,
            spacingLabel
          )}`}
        />
        <ReadonlyWidgetSummaryRow
          id="builder.advanced.layout.margin"
          label="Margin"
          path="layout.margin"
          value={`Top ${formatSharedValue(layoutState.margin.top, spacingLabel)}, bottom ${formatSharedValue(
            layoutState.margin.bottom,
            spacingLabel
          )}`}
        />
      </WidgetEditorSection>
      <WidgetEditorSection
        id="builder.advanced.visibility-summary"
        mode="advanced"
        role="summary"
        title="Visibility summary"
        description="Read-only device visibility. Change daily visibility in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="builder.advanced.visibility.devices"
          label="Shown on"
          path="visibility.devices"
          value={visibilityState.summary}
        />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
