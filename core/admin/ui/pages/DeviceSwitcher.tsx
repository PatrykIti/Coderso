import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const devices = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
] as const;

export type DeviceId = (typeof devices)[number]["id"];

type DeviceSwitcherProps = {
  value?: DeviceId;
  onChange?: (value: DeviceId) => void;
  className?: string;
};

export function DeviceSwitcher({ value, onChange, className }: DeviceSwitcherProps) {
  const [internalValue, setInternalValue] = useState<DeviceId>("desktop");
  const active = value ?? internalValue;

  return (
    <div className={cn("flex items-center gap-1 rounded-lg bg-muted p-1", className)}>
      {devices.map((device) => {
        const isActive = device.id === active;
        const Icon = device.icon;
        return (
          <Button
            key={device.id}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => {
              onChange?.(device.id);
              if (!value) {
                setInternalValue(device.id);
              }
            }}
            className={cn(isActive && "shadow-sm")}
            aria-label={device.label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
