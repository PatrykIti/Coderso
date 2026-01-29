import { Plus, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ThemeRouteDraft = {
  id: string;
  path: string;
  pageId: string | null;
};

export type ThemeRoutesEditorProps = {
  routes: ThemeRouteDraft[];
  pages: Array<{ id: string; title: string }>;
  error?: string | null;
  onChange: (next: ThemeRouteDraft[]) => void;
};

const createRoute = () => ({
  id: typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}`,
  path: "",
  pageId: null,
});

export function ThemeRoutesEditor({
  routes,
  pages,
  error,
  onChange,
}: ThemeRoutesEditorProps) {
  const updateRoute = (index: number, next: Partial<ThemeRouteDraft>) => {
    const updated = routes.map((route, idx) =>
      idx === index ? { ...route, ...next } : route
    );
    onChange(updated);
  };

  const removeRoute = (index: number) => {
    const updated = routes.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-muted/40 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Route mapping
          </p>
          <p className="text-xs text-muted-foreground">
            Map paths to pages for this theme profile.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onChange([...routes, createRoute()])}>
          <Plus className="mr-1 h-4 w-4" />
          Add route
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 px-6 py-6">
          {routes.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
              No routes configured yet. Add a route to map a path to a page.
            </div>
          ) : null}

          {routes.map((route, index) => (
            <div key={route.id} className="space-y-3 rounded-xl border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Route {index + 1}
                </span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Remove route"
                  onClick={() => removeRoute(index)}
                >
                  <Trash className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Path
                </label>
                <Input
                  placeholder="/"
                  value={route.path}
                  onChange={(event) => updateRoute(index, { path: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Page
                </label>
                <Select
                  value={route.pageId ?? "none"}
                  onValueChange={(value) =>
                    updateRoute(index, { pageId: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No page (custom route)</SelectItem>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {error ? (
        <div className="border-t bg-background px-6 py-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
