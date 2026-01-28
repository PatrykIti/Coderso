import type { LucideIcon } from "lucide-react";
import { AlignLeft, AtSign, Calendar, CheckSquare, ListChecks, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const fieldItems: Array<{ label: string; icon: LucideIcon; active?: boolean }> = [
  { label: "Text Input", icon: Type, active: true },
  { label: "Email Field", icon: AtSign },
  { label: "Checkbox", icon: CheckSquare },
  { label: "Select Menu", icon: ListChecks },
  { label: "Textarea", icon: AlignLeft },
  { label: "Date Picker", icon: Calendar },
];

export function FieldLibrary() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Fields Library
        </p>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-3">
          {fieldItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex w-full cursor-grab items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition",
                item.active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <Button
          variant="outline"
          className="w-full text-xs font-semibold uppercase tracking-[0.2em]"
        >
          Advanced Fields
        </Button>
      </div>
    </div>
  );
}
