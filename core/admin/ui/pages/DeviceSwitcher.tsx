import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pageEditorDeviceMetadata } from "../../../services/pages/pageEditorControlRegistry";

const devices = [
  { id: "desktop", icon: Monitor },
  { id: "tablet", icon: Tablet },
  { id: "mobile", icon: Smartphone },
] as const;

export type DeviceId = (typeof devices)[number]["id"];

type DeviceSwitcherProps = {
  value?: DeviceId;
  onChange?: (value: DeviceId) => void;
  className?: string;
};

/**
 * Breakpoint switcher with visible labels and the canonical canvas width
 * readout per device (TASK-425): "Desktop 1080 / Tablet 744 / Mobile 390".
 * Labels and widths come from the single shared source
 * (`pageEditorDeviceMetadata`); the accessible name stays the plain device
 * label.
 */
export function DeviceSwitcher({ value, onChange, className }: DeviceSwitcherProps) {
  const [internalValue, setInternalValue] = useState<DeviceId>("desktop");
  const active = value ?? internalValue;

  return (
    <div className={cn("flex items-center gap-1 rounded-lg bg-muted p-1", className)}>
      {devices.map((device) => {
        const isActive = device.id === active;
        const Icon = device.icon;
        const { label, width } = pageEditorDeviceMetadata[device.id];
        return (
          <Button
            key={device.id}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              onChange?.(device.id);
              if (!value) {
                setInternalValue(device.id);
              }
            }}
            className={cn("gap-1.5 px-2", isActive && "shadow-sm")}
            aria-label={label}
            data-page-editor-device-option={device.id}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{label}</span>
            <span
              className="text-[10px] tabular-nums text-muted-foreground"
              data-page-editor-device-width={device.id}
            >
              {width}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
