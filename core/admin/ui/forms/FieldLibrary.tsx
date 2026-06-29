import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type FieldLibraryItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  type: string;
  helper?: string;
};

type FieldLibraryProps = {
  items: FieldLibraryItem[];
  onAddField: (field: FieldLibraryItem) => void;
};

export function FieldLibrary({ items, onAddField }: FieldLibraryProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Fields Library
        </p>
      </div>
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onAddField(item)}
              className={cn(
                "flex w-full cursor-grab items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                "text-foreground hover:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground hover:[&_svg]:text-primary"
              )}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t p-3">
        <Button variant="outline" className="w-full text-xs font-semibold uppercase tracking-wide">
          Advanced Fields
        </Button>
      </div>
    </div>
  );
}
