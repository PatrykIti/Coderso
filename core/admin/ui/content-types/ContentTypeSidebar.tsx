import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fallbackCollections = [
  { id: "blog", name: "Blog Post", count: 12 },
  { id: "category", name: "Category", count: 8 },
  { id: "author", name: "Author", count: 4 },
];

const fallbackSingles = [{ id: "homepage", name: "Homepage" }];

type ContentTypeSidebarItem = {
  id: string;
  name: string;
  count?: number;
};

type ContentTypeSidebarProps = {
  items?: ContentTypeSidebarItem[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onCreate?: () => void;
};

export function ContentTypeSidebar({
  items,
  activeId,
  onSelect,
  onCreate,
}: ContentTypeSidebarProps) {
  const collections = items ?? fallbackCollections;

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
          {collections.map((item) => {
            const isActive = activeId ? item.id === activeId : false;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="font-medium">{item.name}</span>
                {item.count !== undefined ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {items ? null : (
          <div className="mt-6 space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Single Types
            </p>
            {fallbackSingles.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="border-t p-4">
        <Button className="w-full gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Create New Type
        </Button>
      </div>
    </div>
  );
}
