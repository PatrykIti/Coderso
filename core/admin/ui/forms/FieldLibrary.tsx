import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type FieldLibraryItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type FieldLibraryProps = {
  items: FieldLibraryItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function FieldLibrary({ items, selectedId, onSelect }: FieldLibraryProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Fields Library
        </p>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full cursor-grab items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition",
                selectedId === item.id
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
