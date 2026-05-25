import type { Block, DeviceTarget, WidgetDefinition, WidgetEditorContext } from "./types";
import { applyWidgetBlockPatch, sanitizeLayout } from "./blockUtils";
import {
  ReadonlyWidgetSummaryRow,
  WidgetEditorModeRoot,
  WidgetEditorSection,
} from "../../widgets/editors/WidgetEditorControls";

const deviceLabels: { id: DeviceTarget; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

const spacingLabel = (value: string) => (value === "none" ? "None" : value.toUpperCase());

function resolveVisibilitySummary(block: Block) {
  if (block.visibility?.enabled === false) {
    return "Hidden on all devices";
  }
  const devices = block.visibility?.devices ?? ["desktop", "tablet", "mobile"];
  if (devices.length === 0) {
    return "Hidden on all devices";
  }
  const labels = deviceLabels
    .filter((device) => devices.includes(device.id))
    .map((device) => device.label);
  return labels.length > 0 ? labels.join(", ") : "Hidden on all devices";
}

export type AdvancedPanelProps = {
  block: Block;
  widget: WidgetDefinition;
  onChange: (next: Block) => void;
  onBlockPatch?: (patch: Parameters<typeof applyWidgetBlockPatch>[1]) => void;
  editorContext?: WidgetEditorContext;
};

export function AdvancedPanel({
  block,
  widget,
  onChange,
  onBlockPatch,
  editorContext,
}: AdvancedPanelProps) {
  const Editor = widget.editor.advanced;
  const layoutValue = sanitizeLayout(block.layout);
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
          value={layoutValue.container}
        />
        <ReadonlyWidgetSummaryRow
          id="builder.advanced.layout.padding"
          label="Padding"
          path="layout.padding"
          value={`Top ${spacingLabel(layoutValue.padding.top)}, bottom ${spacingLabel(
            layoutValue.padding.bottom
          )}`}
        />
        <ReadonlyWidgetSummaryRow
          id="builder.advanced.layout.margin"
          label="Margin"
          path="layout.margin"
          value={`Top ${spacingLabel(layoutValue.margin.top)}, bottom ${spacingLabel(
            layoutValue.margin.bottom
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
          value={resolveVisibilitySummary(block)}
        />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
