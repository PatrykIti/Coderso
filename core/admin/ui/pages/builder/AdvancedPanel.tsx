import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import type { Block, DeviceTarget } from "./types";
import { LayoutPanel } from "./LayoutPanel";

const deviceLabels: { id: DeviceTarget; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

export type AdvancedPanelProps = {
  block: Block;
  onChange: (next: Block) => void;
};

export function AdvancedPanel({ block, onChange }: AdvancedPanelProps) {
  const toggleDevice = (device: DeviceTarget) => {
    const devices = block.visibility.devices.includes(device)
      ? block.visibility.devices.filter((entry) => entry !== device)
      : [...block.visibility.devices, device];
    onChange({
      ...block,
      visibility: { ...block.visibility, devices },
    });
  };

  return (
    <div className="space-y-6">
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
          <LayoutPanel
            value={block.layout}
            onChange={(layout) => onChange({ ...block, layout })}
          />
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
                checked={block.visibility.devices.includes(device.id)}
                onCheckedChange={() => toggleDevice(device.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
