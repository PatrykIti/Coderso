import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { FieldEditor } from "./FieldEditor";

type FieldsListPanelProps = {
  fields: ContentField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  className?: string;
};

export function FieldsListPanel({
  fields,
  selectedId,
  onSelect,
  onAdd,
  className,
}: FieldsListPanelProps) {
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
              Add your first field to start building the schema.
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
                <span>{field.label}</span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {field.type}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type FieldSettingsPanelProps = {
  field: ContentField | null;
  nameError?: string | null;
  defaultError?: string | null;
  relationError?: string | null;
  onChange: (next: ContentField) => void;
  onRemove: () => void;
  className?: string;
};

export function FieldSettingsPanel({
  field,
  nameError,
  defaultError,
  relationError,
  onChange,
  onRemove,
  className,
}: FieldSettingsPanelProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-y-auto", className)}>
      {field ? (
        <div className="p-6">
          <FieldEditor
            field={field}
            nameError={nameError}
            defaultError={defaultError}
            relationError={relationError}
            onChange={onChange}
            onRemove={onRemove}
          />
        </div>
      ) : (
        <div className="p-6 text-sm text-muted-foreground">
          Select a field to edit its settings.
        </div>
      )}
    </div>
  );
}

export type FieldType =
  | "text"
  | "richtext"
  | "number"
  | "boolean"
  | "select"
  | "media"
  | "relation";

export type ContentField = {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  help?: string;
  required?: boolean;
  options?: string[];
  relation?: { target: string };
  defaultValue?: string;
};

export function validateFieldName(
  name: string,
  existingNames: Array<{ id: string; name: string }>,
  currentId?: string
) {
  const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!name.trim()) return "Field name is required.";
  if (!kebabCase.test(name)) return "Use kebab-case (e.g. hero-title).";
  const isDuplicate = existingNames.some(
    (entry) => entry.name === name && entry.id !== currentId
  );
  if (isDuplicate) return "Field name must be unique.";
  return null;
}

type SchemaBuilderProps = {
  fields: ContentField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (next: ContentField[]) => void;
  nameError?: string | null;
  defaultError?: string | null;
  relationError?: string | null;
};

export function SchemaBuilder({
  fields,
  selectedId,
  onSelect,
  onChange,
  nameError,
  defaultError,
  relationError,
}: SchemaBuilderProps) {
  const selectedField = fields.find((field) => field.id === selectedId) ?? null;

  const handleAddField = () => {
    const suffix = fields.length + 1;
    const name = `field-${suffix}`;
    const nextField: ContentField = {
      id: crypto.randomUUID(),
      name,
      type: "text",
      label: "New field",
      required: false,
    };
    onChange([...fields, nextField]);
    onSelect(nextField.id);
  };

  const handleUpdateField = (next: ContentField) => {
    onChange(fields.map((field) => (field.id === next.id ? next : field)));
  };

  const handleRemoveField = (id: string) => {
    const next = fields.filter((field) => field.id !== id);
    onChange(next);
    onSelect(next[0]?.id ?? null);
  };

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[240px_1fr]">
      <FieldsListPanel
        fields={fields}
        selectedId={selectedId}
        onSelect={onSelect}
        onAdd={handleAddField}
      />
      <FieldSettingsPanel
        field={selectedField}
        nameError={nameError}
        defaultError={defaultError}
        relationError={relationError}
        onChange={handleUpdateField}
        onRemove={() => {
          if (!selectedField) return;
          handleRemoveField(selectedField.id);
        }}
        className="hidden lg:flex"
      />
    </div>
  );
}
