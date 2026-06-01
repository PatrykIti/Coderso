import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import type {
  Block,
  DeviceTarget,
  WidgetDefinition,
  WidgetEditorContext,
  WidgetLayoutDefaults,
} from "./types";
import {
  applyWidgetBlockPatch,
  resolveSharedBlockVisibilityState,
  sanitizeLayout,
} from "./blockUtils";
import { LayoutPanel } from "./LayoutPanel";
import {
  WidgetControlRow,
  type WidgetControlOwnership,
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
  path?: string;
  ownership?: WidgetControlOwnership;
  labelValue?: string;
  labelPlaceholder?: string;
  labelPath?: string;
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
    path?: string;
    ownership?: WidgetControlOwnership;
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
  pageDefaults?: WidgetLayoutDefaults;
};

export function VisualPanel({
  widget,
  block,
  onChange,
  onBlockPatch,
  editorContext,
  slotControls,
  pageDefaults,
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
  const visibilityState = resolveSharedBlockVisibilityState(block.visibility);
  const devices = visibilityState.devices;
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
                <WidgetControlRow
                  key={action.id}
                  id={action.id}
                  label={action.label}
                  path={action.path}
                  ownership={action.ownership ?? "action"}
                  hideLabel
                  className="space-y-0"
                >
                  {(fieldProps) => (
                    <Button
                      id={fieldProps.id}
                      aria-labelledby={fieldProps["aria-labelledby"]}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={action.disabled}
                      onClick={action.onClick}
                      className="h-8 px-2 text-[11px]"
                    >
                      {action.label}
                    </Button>
                  )}
                </WidgetControlRow>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            {slotControls.items.map((item) => (
              <div
                key={item.id}
                data-widget-control={item.id}
                data-widget-control-path={item.path}
                data-widget-control-ownership={item.ownership ?? "action"}
                className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {item.count} {item.count === 1 ? "item" : "items"}
                    </span>
                    {typeof item.canMoveUp === "boolean" ? (
                      <WidgetControlRow
                        id={`${item.id}.move-up`}
                        label={`Move up ${item.label}`}
                        path={item.path}
                        ownership={item.ownership ?? "action"}
                        hideLabel
                        className="space-y-0"
                      >
                        {(fieldProps) => (
                          <Button
                            id={fieldProps.id}
                            aria-labelledby={fieldProps["aria-labelledby"]}
                            data-widget-control={`${item.id}.move-up`}
                            data-widget-control-path={item.path}
                            data-widget-control-ownership={item.ownership ?? "action"}
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={item.onMoveUp}
                            disabled={!item.canMoveUp}
                          >
                            Move up
                          </Button>
                        )}
                      </WidgetControlRow>
                    ) : null}
                    {typeof item.canMoveDown === "boolean" ? (
                      <WidgetControlRow
                        id={`${item.id}.move-down`}
                        label={`Move down ${item.label}`}
                        path={item.path}
                        ownership={item.ownership ?? "action"}
                        hideLabel
                        className="space-y-0"
                      >
                        {(fieldProps) => (
                          <Button
                            id={fieldProps.id}
                            aria-labelledby={fieldProps["aria-labelledby"]}
                            data-widget-control={`${item.id}.move-down`}
                            data-widget-control-path={item.path}
                            data-widget-control-ownership={item.ownership ?? "action"}
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={item.onMoveDown}
                            disabled={!item.canMoveDown}
                          >
                            Move down
                          </Button>
                        )}
                      </WidgetControlRow>
                    ) : null}
                    {item.canRemove && item.onRemove ? (
                      <WidgetControlRow
                        id={`${item.id}.remove`}
                        label={`Remove ${item.label}`}
                        path={item.path}
                        ownership={item.ownership ?? "action"}
                        hideLabel
                        className="space-y-0"
                      >
                        {(fieldProps) => (
                          <Button
                            id={fieldProps.id}
                            aria-labelledby={fieldProps["aria-labelledby"]}
                            data-widget-control={`${item.id}.remove`}
                            data-widget-control-path={item.path}
                            data-widget-control-ownership={item.ownership ?? "action"}
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={item.onRemove}
                          >
                            Remove
                          </Button>
                        )}
                      </WidgetControlRow>
                    ) : null}
                  </div>
                </div>
                {item.onLabelChange ? (
                  <WidgetControlRow
                    id={`${item.id}.label`}
                    label="Region label"
                    path={item.labelPath}
                    ownership="writable"
                    className="mt-2 space-y-1"
                  >
                    {(fieldProps) => (
                      <Input
                        id={fieldProps.id}
                        aria-labelledby={fieldProps["aria-labelledby"]}
                        value={item.labelValue ?? ""}
                        onChange={(event) => item.onLabelChange?.(event.target.value)}
                        placeholder={item.labelPlaceholder ?? item.label}
                        aria-label={`Rename ${item.label}`}
                        className="h-8 text-xs"
                      />
                    )}
                  </WidgetControlRow>
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
        <LayoutPanel
          value={layoutValue}
          pageDefaults={pageDefaults}
          onChange={(layout) => patchBlock({ layout })}
        />
      </WidgetEditorSection>
      <WidgetEditorSection
        id="builder.visual.visibility"
        mode="visual"
        role="visual"
        title="Device visibility"
        description="Choose which visitor device sizes should show this block."
      >
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground" data-builder-visibility-summary>
            {visibilityState.summary}
            {visibilityState.hiddenOnAllDevices
              ? ". Public rendering is disabled until at least one device is shown."
              : null}
          </p>
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
