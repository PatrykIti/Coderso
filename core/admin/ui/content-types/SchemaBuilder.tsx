import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { FieldEditor } from "./FieldEditor";

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
  onChange: (next: ContentField[]) => void;
};

export function SchemaBuilder({ fields, onChange }: SchemaBuilderProps) {
  const [selectedId, setSelectedId] = useState(fields[0]?.id ?? null);

  const selectedField = fields.find((field) => field.id === selectedId) ?? null;

  const nameErrors = useMemo(() => {
    const names = fields.map((field) => ({ id: field.id, name: field.name }));
    return fields.reduce<Record<string, string | null>>((acc, field) => {
      acc[field.id] = validateFieldName(field.name, names, field.id);
      return acc;
    }, {});
  }, [fields]);

  const defaultError = selectedField?.required && !selectedField.defaultValue
    ? "Required fields need a default value."
    : null;

  const relationError =
    selectedField?.type === "relation" && !selectedField.relation?.target
      ? "Relation target slug is required."
      : null;

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
    setSelectedId(nextField.id);
  };

  const handleUpdateField = (next: ContentField) => {
    onChange(fields.map((field) => (field.id === next.id ? next : field)));
  };

  const handleRemoveField = (id: string) => {
    const next = fields.filter((field) => field.id !== id);
    onChange(next);
    setSelectedId(next[0]?.id ?? null);
  };

  const handleSelect = (id: string) => setSelectedId(id);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="gap-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fields
          </p>
          <Button size="icon-sm" variant="outline" onClick={handleAddField}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => handleSelect(field.id)}
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
          ))}
        </div>
      </Card>
      <Card className="p-5">
        {selectedField ? (
          <FieldEditor
            field={selectedField}
            nameError={nameErrors[selectedField.id]}
            defaultError={defaultError}
            relationError={relationError}
            onChange={handleUpdateField}
            onRemove={() => handleRemoveField(selectedField.id)}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            Select a field to edit its settings.
          </div>
        )}
      </Card>
    </div>
  );
}
