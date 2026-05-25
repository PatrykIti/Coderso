import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import type { Block, DeviceTarget, WidgetDefinition, WidgetEditorContext } from "./types";
import { applyWidgetBlockPatch, sanitizeLayout } from "./blockUtils";
import { LayoutPanel } from "./LayoutPanel";
import {
  WidgetControlRow,
  WidgetEditorModeRoot,
  WidgetEditorSection,
} from "../../widgets/editors/WidgetEditorControls";

const deviceLabels: { id: DeviceTarget; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

export type VisualPanelSlotControlItem = {
  id: string;
  label: string;
  labelValue?: string;
  labelPlaceholder?: string;
  count: number;
  empty: boolean;
  canRemove: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onLabelChange?: (next: string) => void;
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
  const layoutValue = sanitizeLayout(block.layout);
  const patchBlock =
    onBlockPatch ??
    ((patch: Parameters<typeof applyWidgetBlockPatch>[1]) => {
      onChange(applyWidgetBlockPatch(block, patch));
    });
  const devices = block.visibility?.devices ?? ["desktop", "tablet", "mobile"];
  const toggleDevice = (device: DeviceTarget) => {
    const nextDevices = devices.includes(device)
      ? devices.filter((entry) => entry !== device)
      : [...devices, device];
    patchBlock((current) => ({
      ...current,
      visibility: {
        ...current.visibility,
        devices: nextDevices,
        enabled: current.visibility?.enabled ?? true,
      },
    }));
  };

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
                data-widget-control-ownership="action"
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
                {item.onLabelChange ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground">Region label</p>
                    <Input
                      value={item.labelValue ?? ""}
                      onChange={(event) => item.onLabelChange?.(event.target.value)}
                      placeholder={item.labelPlaceholder ?? item.label}
                      aria-label={`Rename ${item.label}`}
                      className="h-8 text-xs"
                    />
                  </div>
                ) : null}
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
      <WidgetEditorSection
        id="builder.visual.block-layout"
        mode="visual"
        role="layout"
        title="Block layout"
        description="Control this block's outer content width and spacing."
      >
        <LayoutPanel value={layoutValue} onChange={(layout) => patchBlock({ layout })} />
      </WidgetEditorSection>
      <WidgetEditorSection
        id="builder.visual.visibility"
        mode="visual"
        role="visual"
        title="Device visibility"
        description="Choose which visitor device sizes should show this block."
      >
        <div className="space-y-2">
          {deviceLabels.map((device) => (
            <WidgetControlRow
              key={device.id}
              id={`builder.visual.visibility.${device.id}`}
              label={device.label}
              path={`visibility.devices.${device.id}`}
            >
              {() => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">
                    {devices.includes(device.id) ? "Shown" : "Hidden"}
                  </span>
                  <Switch
                    checked={devices.includes(device.id)}
                    onCheckedChange={() => toggleDevice(device.id)}
                  />
                </div>
              )}
            </WidgetControlRow>
          ))}
        </div>
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
