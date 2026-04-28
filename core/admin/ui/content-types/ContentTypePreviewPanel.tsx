import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { ContentField } from "./SchemaBuilder";
import { buildSchemaFromFields } from "./schemaMapping";

export type ContentTypePreviewPanelProps = {
  name: string;
  slug: string;
  fields: ContentField[];
};


export function ContentTypePreviewPanel({
  name,
  slug,
  fields,
}: ContentTypePreviewPanelProps) {
  const schema = buildSchemaFromFields(fields);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
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
      <ScrollArea className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-3">
        <pre className="min-w-max whitespace-pre text-xs leading-relaxed text-muted-foreground">
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
