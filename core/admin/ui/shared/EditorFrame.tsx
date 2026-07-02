import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * TASK-499-01: real admin port of the prototype `EditorPreviewFrame` *frame*
 * only (chrome bar / `w-60` left rail / `bg-dotted` canvas / `w-72` right
 * inspector). Unlike the prototype the action slots are REAL — there is no
 * "Preview only" pill and no static device toggle; the host wires Undo/Redo or
 * real Save/Publish into `actions`.
 *
 * The rail primitives are NOT re-declared here — they live in `./EditorRail`
 * (TASK-497-02 B9) and are re-exported at the bottom so the menu rail imports
 * `EditorRailGroup`/`EditorRailItem` from one place instead of forking a copy.
 */
export function EditorFrame({
  title,
  toolbar,
  actions,
  left,
  canvas,
  right,
  className,
}: {
  title: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  left?: ReactNode;
  canvas: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card",
        className
      )}
      data-editor-frame="true"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {toolbar}
        </div>
        <div className="flex items-center gap-1.5">{actions}</div>
      </div>
      <div className="flex min-h-0 flex-1">
        {left ? (
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-3 lg:block">
            {left}
          </aside>
        ) : null}
        <div className="min-w-0 flex-1 overflow-y-auto bg-dotted p-6">{canvas}</div>
        {right ? (
          <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border bg-card p-4 xl:block">
            {right}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

// EditorRailGroup / EditorRailItem: NOT re-declared — re-exported from the
// shipped shared primitive so the menu rail imports them from one place.
export { EditorRailGroup, EditorRailItem } from "./EditorRail";
