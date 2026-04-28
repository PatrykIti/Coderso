import { FileText, Plus, Search, ShoppingBag, Tag, User } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [hideEmpty, setHideEmpty] = useState(false);
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    types.forEach((type) => {
      const key = type.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [types]);
  const filteredTypes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const searchable = !normalized
      ? types
      : types.filter(
      (type) =>
        type.name.toLowerCase().includes(normalized) ||
        type.slug.toLowerCase().includes(normalized)
    );
    return searchable.filter(
      (type) =>
        !hideEmpty ||
        (type.count ?? 0) > 0 ||
        type.slug === activeSlug
    );
  }, [activeSlug, hideEmpty, types, query]);

  const groupedTypes = useMemo(
    () => [
      {
        id: "with-entries",
        label: "With entries",
        items: filteredTypes.filter((type) => (type.count ?? 0) > 0),
      },
      {
        id: "empty",
        label: "Empty",
        items: filteredTypes.filter((type) => (type.count ?? 0) === 0),
      },
    ],
    [filteredTypes]
  );

  const renderTypeButton = (type: EntryTypeItem) => {
    const Icon = resolveIcon(type.slug);
    const isActive = type.slug === activeSlug;
    const hasDuplicateName = (duplicateNames.get(type.name.trim().toLowerCase()) ?? 0) > 1;
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
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              isActive
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block truncate font-medium">{type.name}</span>
            {hasDuplicateName ? (
              <span className="block truncate text-[11px] text-muted-foreground">
                {type.slug}
              </span>
            ) : null}
          </span>
        </div>
        <Badge
          variant={isActive ? "secondary" : "ghost"}
          className={cn(
            "ml-2 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold",
            isActive
              ? "border border-primary/20 bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
        >
          {type.count ?? 0}
        </Badge>
      </button>
    );
  };

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
        <label className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Checkbox
            checked={hideEmpty}
            onCheckedChange={(checked) => setHideEmpty(checked === true)}
            aria-label="Hide empty content types"
          />
          Hide empty content types
        </label>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {groupedTypes.map((group) =>
            group.items.length > 0 ? (
              <div key={group.id} className="space-y-1">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map(renderTypeButton)}
              </div>
            ) : null
          )}
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
