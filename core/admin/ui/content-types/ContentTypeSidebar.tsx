import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const collections = [
  { name: "Blog Post", count: 12, active: true },
  { name: "Category", count: 8 },
  { name: "Author", count: 4 },
];

const singles = [
  { name: "Homepage" },
  { name: "Global Settings" },
];

export function ContentTypeSidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter types..." className="pl-9" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collections
          </p>
          {collections.map((item) => (
            <button
              key={item.name}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="font-medium">{item.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {item.count}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Single Types
          </p>
          {singles.map((item) => (
            <button
              key={item.name}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="border-t p-4">
        <Button className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Create New Type
        </Button>
      </div>
    </div>
  );
}
