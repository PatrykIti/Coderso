import { FileText, Plus, Search, ShoppingBag, Tag, User } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const resolveIcon = (slug: string) => {
  if (slug.includes("product")) return ShoppingBag;
  if (slug.includes("author") || slug.includes("staff")) return User;
  if (slug.includes("category") || slug.includes("tag")) return Tag;
  return FileText;
};

type EntryTypeItem = {
  id: string;
  slug: string;
  name: string;
  count?: number;
};

type EntryTypeSidebarProps = {
  types: EntryTypeItem[];
  activeSlug?: string | null;
  onSelect?: (slug: string) => void;
  onCreateCollection?: () => void;
  className?: string;
};

export function EntryTypeSidebar({
  types,
  activeSlug,
  onSelect,
  onCreateCollection,
  className,
}: EntryTypeSidebarProps) {
  const [query, setQuery] = useState("");
  const filteredTypes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return types;
    return types.filter(
      (type) =>
        type.name.toLowerCase().includes(normalized) ||
        type.slug.toLowerCase().includes(normalized)
    );
  }, [types, query]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Content Types
        </p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search types..."
            className="pl-9"
          />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {filteredTypes.map((type) => {
            const Icon = resolveIcon(type.slug);
            const isActive = type.slug === activeSlug;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => onSelect?.(type.slug)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{type.name}</span>
                </div>
                <Badge
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "border border-primary/20 bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {type.count ?? 0}
                </Badge>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full border-dashed text-muted-foreground hover:text-primary"
          onClick={onCreateCollection}
        >
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>
    </div>
  );
}
