import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { ContentField } from "./SchemaBuilder";

export type ContentTypePreviewPanelProps = {
  name: string;
  slug: string;
  fields: ContentField[];
};

function toSchemaProperties(fields: ContentField[]) {
  return fields.reduce<Record<string, Record<string, unknown>>>((acc, field) => {
    let type: "string" | "number" | "boolean" = "string";
    if (field.type === "number") type = "number";
    if (field.type === "boolean") type = "boolean";

    const definition: Record<string, unknown> = { type };

    if (field.label) definition.title = field.label;
    if (field.help) definition.description = field.help;
    if (field.type === "select" && field.options?.length) {
      definition.enum = field.options;
    }
    if (field.defaultValue !== undefined && field.defaultValue !== "") {
      if (field.type === "number") {
        const parsed = Number(field.defaultValue);
        if (!Number.isNaN(parsed)) definition.default = parsed;
      } else if (field.type === "boolean") {
        definition.default = field.defaultValue === "true";
      } else {
        definition.default = field.defaultValue;
      }
    }

    acc[field.name] = definition;
    return acc;
  }, {});
}

export function ContentTypePreviewPanel({
  name,
  slug,
  fields,
}: ContentTypePreviewPanelProps) {
  const required = fields
    .filter((field) => field.required)
    .map((field) => field.name);

  const schema = {
    type: "object",
    additionalProperties: false,
    ...(required.length ? { required } : {}),
    properties: toSchemaProperties(fields),
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Schema Preview</h3>
          <p className="text-xs text-muted-foreground">
            JSON schema stored in the database.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 rounded-lg border bg-muted/40 p-3">
        <pre className="text-xs leading-relaxed text-muted-foreground">
          {JSON.stringify(schema, null, 2)}
        </pre>
      </ScrollArea>
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        <p>Type: {name}</p>
        <p>Slug: {slug}</p>
        <p>Schema is validated before saving.</p>
      </div>
    </div>
  );
}
