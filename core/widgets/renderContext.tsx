import type { ReactNode } from "react";

import type { WidgetRenderContext } from "./types";

export function shouldRenderEditorPlaceholder(renderContext?: WidgetRenderContext): boolean {
  return renderContext?.mode === "editor-preview" || renderContext?.mode === "admin-preview";
}

export function renderEditorPlaceholder(
  message: string,
  renderContext?: WidgetRenderContext
): ReactNode {
  if (!shouldRenderEditorPlaceholder(renderContext)) {
    return null;
  }

  return (
    <div className="rounded-md border border-dashed px-4 py-5 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
