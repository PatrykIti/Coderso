import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { ContentSchema } from "./schemaMapping";

type SchemaPreviewPanelProps = {
  schema: ContentSchema;
};

export function SchemaPreviewPanel({ schema }: SchemaPreviewPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Schema Preview</h3>
          <p className="text-xs text-muted-foreground">Generated JSON schema for the API.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Copy className="h-4 w-4" />
          Copy JSON
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 rounded-lg border bg-muted/40 p-3">
        <pre className="text-xs leading-relaxed text-muted-foreground">
          {JSON.stringify(schema, null, 2)}
        </pre>
      </ScrollArea>
      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        Preview updates live as you edit fields. Use the JSON schema for external tooling and
        validation checks.
      </div>
    </div>
  );
}
