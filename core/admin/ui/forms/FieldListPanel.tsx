import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FormFieldListItem = {
  id: string;
  label: string;
  name: string;
  type: string;
  required: boolean;
};

type FieldListPanelProps = {
  fields: FormFieldListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  className?: string;
};

export function FieldListPanel({
  fields,
  selectedId,
  onSelect,
  onAdd,
  className,
}: FieldListPanelProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredFields = useMemo(() => {
    if (!normalizedQuery) return fields;
    return fields.filter((field) => {
      const haystack = [field.label, field.name, field.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [fields, normalizedQuery]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fields
        </p>
        <Button size="icon-sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {fields.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
              Add your first field to start building the form.
            </div>
          ) : filteredFields.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
              No fields match this search.
            </div>
          ) : (
            filteredFields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => onSelect(field.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                  field.id === selectedId
                    ? "border-primary/50 bg-primary/5"
                    : "border-transparent bg-muted/30"
                )}
              >
                <div>
                  <p className="font-medium text-foreground">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {field.required ? (
                    <Badge variant="outline" className="text-[10px]">
                      Required
                    </Badge>
                  ) : null}
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {field.type}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
