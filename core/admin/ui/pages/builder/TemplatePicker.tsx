import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isApiClientError } from "@/services/apiClient";
import {
  listWidgetTemplates,
  type WidgetTemplate,
} from "@/services/widgetTemplatesClient";

const statusBadgeMap: Record<string, string> = {
  published: "Published",
  draft: "Draft",
};

type TemplatePickerProps = {
  onAdd: (template: { id: string; name: string }) => void;
};

export function TemplatePicker({ onAdd }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    listWidgetTemplates()
      .then((payload) => {
        if (!active) return;
        setTemplates(payload.items ?? []);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load templates.");
        }
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTemplates = useMemo(() => {
    if (!normalizedQuery) return templates;
    return templates.filter((template) => {
      const haystack = [template.name, template.description, template.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, templates]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Find templates..."
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              Loading templates...
            </div>
          ) : null}
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {!isLoading && !error && filteredTemplates.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              No templates match this search.
            </div>
          ) : null}
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border bg-background p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{template.name}</p>
                    <Badge variant={template.status === "published" ? "default" : "outline"}>
                      {statusBadgeMap[template.status] ?? template.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.description ?? "Reusable template section."}
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => onAdd({ id: template.id, name: template.name })}
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
