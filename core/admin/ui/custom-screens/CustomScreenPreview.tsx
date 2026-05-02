import { LayoutTemplate } from "lucide-react";
import { useMemo } from "react";

import type { Block } from "@/ui/pages/builder/types";
import { ensureRuntimeWidgetsRegistered } from "../../../widgets/runtime";
import { applyBindingsToBlocks } from "../../../services/customScreens/bindingResolver";
import type { CustomScreenBinding } from "../../../services/customScreens/customScreenSchemas";
import { WidgetRenderer } from "../../../widgets/renderers/widgetRenderer";

type CustomScreenPreviewProps = {
  blocks: Block[];
  bindings: CustomScreenBinding[];
  data: Record<string, unknown>;
  emptyTitle?: string;
  emptyMessage?: string;
};

export function CustomScreenPreview({
  blocks,
  bindings,
  data,
  emptyTitle,
  emptyMessage,
}: CustomScreenPreviewProps) {
  ensureRuntimeWidgetsRegistered();

  const previewBlocks = useMemo(
    () => applyBindingsToBlocks(blocks, bindings, data),
    [bindings, blocks, data]
  );

  if (previewBlocks.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
          <LayoutTemplate className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          {emptyTitle ?? "Preview unavailable"}
        </h2>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          {emptyMessage ?? "Add widgets and bindings to preview the custom screen."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {previewBlocks.map((block) => (
        <div
          key={block.id}
          className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm"
        >
          <WidgetRenderer block={block} />
        </div>
      ))}
    </div>
  );
}
