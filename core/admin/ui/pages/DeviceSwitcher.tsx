import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const devices = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
] as const;

type DeviceId = (typeof devices)[number]["id"];

export function DeviceSwitcher() {
  const [active, setActive] = useState<DeviceId>("desktop");

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {devices.map((device) => {
        const isActive = device.id === active;
        const Icon = device.icon;
        return (
          <Button
            key={device.id}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setActive(device.id)}
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
