import { LayoutTemplate } from "lucide-react";

import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import type { ContentField } from "../content-types/SchemaBuilder";
import { ScreenRuntimeRenderer } from "./ScreenRuntimeRenderer";

type CustomScreenPreviewProps = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  data: Record<string, unknown>;
  fields?: ContentField[];
  emptyTitle?: string;
  emptyMessage?: string;
};

export function CustomScreenPreview({
  document,
  bindings,
  data,
  fields,
  emptyTitle,
  emptyMessage,
}: CustomScreenPreviewProps) {
  if (!document.sections.some((section) => section.blocks.length > 0)) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
          <LayoutTemplate className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          {emptyTitle ?? "Preview unavailable"}
        </h2>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          {emptyMessage ?? "Add screen blocks and bindings to preview the custom screen."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
      <ScreenRuntimeRenderer
        document={document}
        bindings={bindings}
        values={data}
        fields={fields}
        mode="preview"
      />
    </div>
  );
}
