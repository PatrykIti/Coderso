import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import type { Block, DeviceTarget, WidgetDefinition, WidgetEditorContext } from "./types";
import { LayoutPanel } from "./LayoutPanel";
import { applyWidgetBlockPatch, sanitizeLayout } from "./blockUtils";
import { WidgetEditorModeRoot } from "../../widgets/editors/WidgetEditorControls";

const deviceLabels: { id: DeviceTarget; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

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
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Layout
          </p>
          <Badge variant="outline" className="text-[10px]">
            Tokens only
          </Badge>
        </div>
        <div className="mt-3">
          <LayoutPanel value={layoutValue} onChange={(layout) => patchBlock({ layout })} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Visibility
        </p>
        <div className="mt-3 space-y-2">
          {deviceLabels.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <span className="text-sm font-medium">{device.label}</span>
              <Switch
                checked={devices.includes(device.id)}
                onCheckedChange={() => toggleDevice(device.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </WidgetEditorModeRoot>
  );
}
