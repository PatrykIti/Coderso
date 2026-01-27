import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { ContentField, FieldType } from "./SchemaBuilder";

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "richtext", label: "Rich text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select" },
  { value: "media", label: "Media" },
  { value: "relation", label: "Relation" },
];

type FieldEditorProps = {
  field: ContentField;
  nameError?: string | null;
  defaultError?: string | null;
  relationError?: string | null;
  onChange: (next: ContentField) => void;
  onRemove: () => void;
};

export function FieldEditor({
  field,
  nameError,
  defaultError,
  relationError,
  onChange,
  onRemove,
}: FieldEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Field settings</h3>
          <p className="text-xs text-muted-foreground">
            Configure label, type, and validation rules.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRemove}>
          Remove field
        </Button>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Field name (kebab-case)
        </label>
        <Input
          value={field.name}
          onChange={(event) => onChange({ ...field, name: event.target.value })}
        />
        {nameError ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {nameError}
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Label
        </label>
        <Input
          value={field.label}
          onChange={(event) => onChange({ ...field, label: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Field type
        </label>
        <Select
          value={field.type}
          onValueChange={(value) =>
            onChange({ ...field, type: value as FieldType })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {fieldTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {field.type === "select" ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Options (comma separated)
          </label>
          <Input
            value={field.options?.join(", ") ?? ""}
            onChange={(event) =>
              onChange({
                ...field,
                options: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      ) : null}
      {field.type === "relation" ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Relation target slug
          </label>
          <Input
            value={field.relation?.target ?? ""}
            onChange={(event) =>
              onChange({
                ...field,
                relation: { target: event.target.value },
              })
            }
          />
          {relationError ? (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {relationError}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Help text
        </label>
        <Textarea
          value={field.help ?? ""}
          onChange={(event) => onChange({ ...field, help: event.target.value })}
          rows={3}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Required</p>
          <p className="text-xs text-muted-foreground">
            Field must be filled in.
          </p>
        </div>
        <Switch
          checked={field.required}
          onCheckedChange={(checked) =>
            onChange({ ...field, required: checked })
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Default value
        </label>
        <Input
          value={field.defaultValue ?? ""}
          onChange={(event) =>
            onChange({ ...field, defaultValue: event.target.value })
          }
        />
        {defaultError ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {defaultError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
