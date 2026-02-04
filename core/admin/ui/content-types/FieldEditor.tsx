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
  relationTargets?: Array<{ slug: string; name: string }>;
  onChange: (next: ContentField) => void;
  onRemove: () => void;
};

export function FieldEditor({
  field,
  nameError,
  defaultError,
  relationError,
  relationTargets = [],
  onChange,
  onRemove,
}: FieldEditorProps) {
  const relationOptions =
    relationTargets.length > 0
      ? relationTargets
      : field.relation?.target
        ? [{ slug: field.relation.target, name: field.relation.target }]
        : [];

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
      {field.type === "media" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Accepted file types
            </label>
            <Input
              value={field.media?.accept?.join(", ") ?? ""}
              onChange={(event) =>
                onChange({
                  ...field,
                  media: {
                    ...field.media,
                    accept: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="image/*, application/pdf"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated MIME patterns (leave empty for all types).
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Allow multiple</p>
              <p className="text-xs text-muted-foreground">
                Enable picking more than one asset.
              </p>
            </div>
            <Switch
              checked={field.media?.multiple ?? false}
              onCheckedChange={(checked) =>
                onChange({
                  ...field,
                  media: {
                    ...field.media,
                    multiple: checked,
                    ...(checked ? {} : { maxItems: undefined }),
                  },
                })
              }
            />
          </div>
          {field.media?.multiple ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Max items
              </label>
              <Input
                type="number"
                min={1}
                value={field.media?.maxItems ?? ""}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  onChange({
                    ...field,
                    media: {
                      ...field.media,
                      maxItems: Number.isFinite(next) && next > 0 ? next : undefined,
                    },
                  });
                }}
                placeholder="Leave empty for no limit"
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {field.type === "relation" ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Related content type
          </label>
          {relationOptions.length > 0 ? (
            <Select
              value={field.relation?.target ?? ""}
              onValueChange={(value) =>
                onChange({
                  ...field,
                  relation: { target: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {relationOptions.map((option) => (
                  <SelectItem key={option.slug} value={option.slug}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={field.relation?.target ?? ""}
              onChange={(event) =>
                onChange({
                  ...field,
                  relation: { target: event.target.value },
                })
              }
              placeholder="Create a content type first"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Pick which content type this field should link to (e.g. Team → Projects).
          </p>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Allow multiple</p>
              <p className="text-xs text-muted-foreground">
                Enable linking to multiple entries in this relation field.
              </p>
            </div>
            <Switch
              checked={field.relation?.multiple ?? false}
              onCheckedChange={(checked) =>
                onChange({
                  ...field,
                  relation: {
                    target: field.relation?.target ?? "",
                    ...(checked ? { multiple: true } : {}),
                  },
                })
              }
            />
          </div>
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
