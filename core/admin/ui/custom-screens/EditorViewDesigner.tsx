import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import {
  addScreenBlock,
  createScreenBlock,
  removeScreenBindingsForBlockTree,
  removeScreenBlock,
} from "../../../services/customScreens/screenDocumentOps";
import type { CustomScreenEditorViewDefinitionV4 } from "../../../services/customScreens/customScreenSchemas";

type EditorViewDesignerProps = {
  contentType: ContentTypeSummary | null;
  value: CustomScreenEditorViewDefinitionV4;
  onChange: (next: CustomScreenEditorViewDefinitionV4) => void;
};

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
    const created = createScreenBlock({
      type: "field",
      field: field.name,
      label: field.label,
    });
    onChange({
      ...value,
      document: addScreenBlock(value.document, created.block),
      bindings: [...value.bindings, ...created.bindings],
    });
  };

  const removeField = (fieldName: string) => {
    const binding = value.bindings.find((item) => item.field === fieldName);
    if (!binding) return;
    const result = removeScreenBlock(value.document, binding.blockId);
    if (!result.removed) return;
    onChange({
      ...value,
      document: result.document,
      bindings: removeScreenBindingsForBlockTree(value.bindings, result.removed),
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
