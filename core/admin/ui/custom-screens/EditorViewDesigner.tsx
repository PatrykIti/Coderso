import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { createBlock } from "@/ui/pages/builder/blockUtils";
import type { CustomScreenEditorViewDefinition } from "../../../services/customScreens/customScreenSchemas";

type EditorViewDesignerProps = {
  contentType: ContentTypeSummary | null;
  value: CustomScreenEditorViewDefinition;
  onChange: (next: CustomScreenEditorViewDefinition) => void;
};

const toBindingId = (blockId: string, field: string) =>
  `${blockId}-${field}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function EditorViewDesigner({ contentType, value, onChange }: EditorViewDesignerProps) {
  const fields = useMemo(
    () => (contentType ? fieldsFromSchema(contentType.schema) : []),
    [contentType]
  );
  const writableFields = useMemo(
    () =>
      new Set(
        value.bindings
          .filter((binding) => binding.mode === "write" || binding.mode === "readwrite")
          .map((binding) => binding.field)
      ),
    [value.bindings]
  );

  const addField = (fieldName: string) => {
    const field = fields.find((item) => item.name === fieldName);
    if (!field || writableFields.has(field.name)) return;
    const block = {
      ...createBlock("screen-field-value"),
      data: {
        label: field.label,
        value: field.label,
        helper: field.help ?? "",
      },
    };
    onChange({
      ...value,
      blocks: [...value.blocks, block],
      bindings: [
        ...value.bindings,
        {
          id: toBindingId(block.id, field.name),
          widgetId: block.id,
          propPath: "value",
          field: field.name,
          mode: "readwrite",
        },
      ],
    });
  };

  const removeField = (fieldName: string) => {
    const bindingWidgetIds = new Set(
      value.bindings
        .filter((binding) => binding.field === fieldName)
        .map((binding) => binding.widgetId)
    );
    onChange({
      ...value,
      blocks: value.blocks.filter((block) => !bindingWidgetIds.has(block.id)),
      bindings: value.bindings.filter((binding) => binding.field !== fieldName),
    });
  };

  if (!contentType) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Select a content type before configuring Editor View.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border">
        {fields.map((field) => {
          const enabled = writableFields.has(field.name);
          return (
            <div
              key={field.name}
              className="flex flex-wrap items-center justify-between gap-3 border-b p-3 last:border-b-0"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{field.label}</p>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {field.type}
                  </Badge>
                  {field.required ? (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      Required
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{field.name}</p>
              </div>
              {enabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(field.name)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addField(field.name)}
                >
                  <Plus className="h-4 w-4" />
                  Add field
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
