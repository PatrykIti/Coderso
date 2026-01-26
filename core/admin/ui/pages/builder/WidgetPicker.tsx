import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { widgetRegistry } from "./widgetRegistry";

type WidgetPickerProps = {
  onAdd: (type: string) => void;
};

export function WidgetPicker({ onAdd }: WidgetPickerProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <Input placeholder="Find components..." />
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {widgetRegistry.map((widget) => (
            <div
              key={widget.type}
              className="rounded-lg border bg-background p-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{widget.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {widget.description}
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => onAdd(widget.type)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
