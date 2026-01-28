import { FileText, Plus, Search, ShoppingBag, Tag, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const contentTypes = [
  {
    id: "blog-posts",
    name: "Blog Posts",
    count: 124,
    icon: FileText,
    active: true,
  },
  { id: "products", name: "Products", count: 42, icon: ShoppingBag },
  { id: "authors", name: "Authors", count: 8, icon: User },
  { id: "categories", name: "Categories", count: 12, icon: Tag },
];

type EntryTypeSidebarProps = {
  onCreateCollection?: () => void;
};

export function EntryTypeSidebar({ onCreateCollection }: EntryTypeSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Content Types
        </p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search types..." className="pl-9" />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {contentTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  type.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      type.active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{type.name}</span>
                </div>
                <Badge
                  variant={type.active ? "secondary" : "ghost"}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    type.active
                      ? "border border-primary/20 bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {type.count}
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
