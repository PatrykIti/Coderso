import {
  GripHorizontal,
  Monitor,
  PanelRight,
  Redo2,
  SlidersHorizontal,
  Smartphone,
  Undo2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * TASK-479-06-L06: interactive-canvas + FLOATING PANEL editor surface — the
 * Page Editor V2 model ported from `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`.
 *
 * The floating panel is the sole control surface (no permanent side rails) and
 * can be hidden via the chrome toggle so the canvas/preview is unobstructed
 * while arranging sections & blocks; a reopen affordance restores it. This is a
 * purely presentational shell: the host editor owns `canvas` (its block tree /
 * preview) and `panel` (its controls) and wires `toolbar` + undo/redo to its
 * real history & autosave. `CanvasEditor` owns only `panelOpen` (lazy `useState`,
 * toggled by user events — never derived from props in an effect, never reset on
 * the host's data changes), so it never overwrites a host dirty buffer and never
 * refetches on mount.
 *
 * Meant for reuse by the page, post, custom-screen entry-view, entry-content,
 * and page-template editors, mounted inside `EditorShell variant="canvas"` (L05).
 * Adopting it per-editor is out of scope here (→ TASK-479-07).
 */
type CanvasEditorProps = {
  title?: ReactNode;
  /** e.g. a status pill rendered next to the title. */
  badge?: ReactNode;
  /** Host-provided chrome controls (slot) — e.g. real undo/redo, save state. */
  toolbar?: ReactNode;
  /** Show the desktop/mobile preview segmented control. */
  device?: boolean;
  /** The interactive preview surface (host-owned). */
  canvas: ReactNode;
  /** The single floating control panel body (host-owned). */
  panel?: ReactNode;
  panelTitle?: ReactNode;
  /** Right inspector OR bottom toolbar placement for the floating panel. */
  panelPosition?: "right" | "bottom";
  panelClassName?: string;
  className?: string;
  /** Lazy initial open state — NO sync setState in effects, never re-derived. */
  defaultPanelOpen?: boolean;
};

export function CanvasEditor({
  title = "Canvas",
  badge,
  toolbar,
  device = true,
  canvas,
  panel,
  panelTitle,
  panelPosition = "right",
  panelClassName,
  className,
  defaultPanelOpen = true,
}: CanvasEditorProps) {
  // Panel open/close is this component's ONLY state — lazy init from the prop so
  // a host data re-render never resets it (ESLint react-hooks safe: no effect).
  const [panelOpen, setPanelOpen] = useState(defaultPanelOpen);

  return (
    <div
      className={cn(
        // Fixed viewport-height pane so the canvas scrolls INTERNALLY and the
        // floating panel stays pinned/visible even on tall content.
        "flex h-[calc(100vh-12rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card",
        className
      )}
    >
      {/* Chrome bar: title + badge, host toolbar slot, undo/redo + device + panel toggle. */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge}
        </div>
        <div className="flex items-center gap-1.5">
          {toolbar}
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          {/* Undo/Redo are slots the host wires to its real history via `toolbar`;
              the built-ins are disabled placeholders so the chrome reads complete. */}
          <Button variant="ghost" size="icon-sm" aria-label="Undo" disabled>
            <Undo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Redo" disabled>
            <Redo2 className="size-4" />
          </Button>
          {device ? (
            <div className="ml-1 hidden items-center rounded-lg border border-border bg-card p-0.5 sm:flex">
              <span className="flex size-6 items-center justify-center rounded-md bg-muted text-foreground">
                <Monitor className="size-3.5" />
              </span>
              <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground">
                <Smartphone className="size-3.5" />
              </span>
            </div>
          ) : null}
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          {/* Show/hide the single floating options panel. */}
          <Button
            variant={panelOpen ? "soft" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => setPanelOpen((v) => !v)}
            aria-label={panelOpen ? "Hide panel" : "Show panel"}
            aria-pressed={panelOpen}
          >
            <PanelRight className="size-4" />
            <span className="hidden sm:inline">{panelOpen ? "Hide panel" : "Panel"}</span>
          </Button>
        </div>
      </div>

      {/* Canvas surface with the single floating panel overlaid. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto bg-dotted p-6 lg:p-8">{canvas}</div>

        {panelOpen ? (
          <div
            className={cn(
              "absolute z-20",
              panelPosition === "right" && "right-4 top-4 w-[280px]",
              panelPosition === "bottom" && "bottom-5 left-1/2 -translate-x-1/2",
              panelClassName
            )}
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-popover shadow-pop">
              {panelTitle ? (
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <GripHorizontal className="size-4 cursor-grab text-muted-foreground/60" />
                  <span className="flex-1 text-xs font-semibold">{panelTitle}</span>
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Hide panel"
                  >
                    <PanelRight className="size-3.5" />
                  </button>
                </div>
              ) : null}
              <div className={panelPosition === "right" ? "max-h-[58vh] overflow-y-auto" : ""}>
                {panel}
              </div>
            </div>
          </div>
        ) : (
          // Reopen affordance when the panel is hidden.
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary"
          >
            <SlidersHorizontal className="size-3.5" /> Show panel
          </button>
        )}
      </div>
    </div>
  );
}

/** A block chip for the "add block" palette inside floating panels. */
export function BlockChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground"
    >
      {icon}
      {label}
    </button>
  );
}
