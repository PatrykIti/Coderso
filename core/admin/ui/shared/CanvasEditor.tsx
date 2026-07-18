import type { ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

/**
 * TASK-496-01: the ONE shared editor-chrome shell (repurposed in place from the
 * TASK-479-06-L06 orphan). Reproduces the PROVEN PageEditor builder chrome
 * (TASK-495-03) so Pages, Page Templates (this leaf) and Screens (TASK-496-02)
 * render the IDENTICAL frame: the in-content `PageHeader` region + the separated
 * `rounded-2xl border bg-card shadow-card` card + the "Page builder" sub-toolbar
 * + an optional device-context strip + the dotted canvas region + the single
 * right/bottom floating panel (positioned + shown/hidden here).
 *
 * Presentational ONLY — the host owns the canvas tree, the panel body, history,
 * autosave, and the `panelOpen` flag. `panelOpen` is CONTROLLED, read-only: the
 * shell only READS it (to decide whether to render the panel + the reopen
 * affordance) and NEVER calls `onPanelOpenChange`. Both panel affordances — the
 * toolbar's "Hide/Show panel" toggle and the `reopenAffordance` chip — are
 * host-supplied slots that flip the host's OWN setter directly, so the host
 * stays the single source of truth (it derives the canvas right-clearance and
 * the floating-toolbar visibility from the same flag; an internal `panelOpen`
 * would fork that state). This controlled read-only model is the one deliberate
 * deviation from the orphan's prior uncontrolled `panelOpen` + built-in toggle.
 *
 * IMPORTS: `cn` + react types only. The header / toolbar / panel / badge /
 * reopen are all host-supplied `ReactNode` slots, so the shell imports NO
 * `PageHeader`, NO `Button`, NO `lucide-react`, and NO data/service module —
 * keeping it inside the custom-screen authoring boundary for the 496-02 Screen
 * consumers as well as the Pages host here.
 */
type CanvasEditorProps = {
  /**
   * In-content `PageHeader` region rendered ABOVE the card (host supplies the
   * node, including its className "mb-0 shrink-0 px-6 pb-3 pt-4").
   */
  header?: ReactNode;

  /** Sub-toolbar (chrome bar) title, e.g. "Page builder". */
  title: ReactNode;
  /** Optional status pill next to the title, e.g. a "Save only" badge. */
  badge?: ReactNode;
  /**
   * Host control cluster rendered VERBATIM on the right of the sub-toolbar
   * (StatusBadge + Unsaved, Undo/Redo, DeviceSwitcher, Layers, Panel toggle).
   * The shell renders NO built-in undo/redo/device controls — the host's wired
   * controls win.
   */
  toolbar?: ReactNode;

  /**
   * Optional device-context strip below the sub-toolbar; `value` feeds the
   * `data-page-editor-canvas-context` hook. Omit it (e.g. for Screens).
   */
  deviceContext?: { value: string; label: ReactNode };

  /** Canvas region — host: dotted scroller + page frame + sections + layers overlay. */
  canvas: ReactNode;

  /**
   * Single floating panel body (already wrapped in any tone context by the
   * host). Pass `null` when nothing is selected so no rail renders.
   */
  panel?: ReactNode;
  /** CONTROLLED, read-only — host is the single source of truth; the shell only READS it. */
  panelOpen: boolean;
  /**
   * Host's `setPanelOpen` passthrough (controlled-prop symmetry; keeps the
   * host's setter referenced for surfaces with no built-in hide toggle). REQUIRED
   * so the host wires it, but the shell NEVER consumes it (it is intentionally
   * not destructured below) — the toolbar toggle + `reopenAffordance` slots flip
   * the host setter directly.
   */
  onPanelOpenChange: (open: boolean) => void;
  /** Floating-panel dock. */
  panelPosition?: "right" | "bottom";
  /** Ref on the single rail div (= the host's toolbar element ref). */
  panelRef?: Ref<HTMLDivElement>;
  /** Required aria-label on the rail div, e.g. `${target} tools`. */
  panelAriaLabel: string;
  /** data-* hooks forwarded onto the rail div (floating-toolbar / -collapsed). */
  panelDataProps?: Record<string, string | undefined>;
  /** Host-gated "Show panel" chip; the shell renders it only when `!panelOpen`. */
  reopenAffordance?: ReactNode;

  className?: string;
};

// Container classes are the EXACT strings lifted from the proven PageEditor
// builder chrome (the right rail = the builder floating-toolbar container).
const PANEL_POSITION_CLASS = {
  right:
    "absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[min(280px,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-2 text-foreground shadow-pop",
  // Centered-bottom dock (prototype CanvasEditor) — first exercised by the
  // Screen entry-content editor in TASK-496-02, not by Pages here.
  bottom:
    "absolute bottom-5 left-1/2 z-30 flex max-h-[calc(100%-2rem)] w-[min(760px,calc(100%-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-popover p-2 text-foreground shadow-pop",
} as const;

export function CanvasEditor({
  header,
  title,
  badge,
  toolbar,
  deviceContext,
  canvas,
  panel,
  panelOpen,
  // `onPanelOpenChange` is deliberately NOT destructured — the shell is
  // controlled read-only and never calls it; it stays a required prop only so
  // the host passes its setPanelOpen through (keeping that setter referenced
  // host-side). Destructuring it here would trip @typescript-eslint/no-unused-vars.
  panelPosition,
  panelRef,
  panelAriaLabel,
  panelDataProps,
  reopenAffordance,
  className,
}: CanvasEditorProps) {
  return (
    <>
      {header}
      <div
        className={cn(
          "mx-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card",
          className
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            {badge}
          </div>
          <div className="flex items-center gap-1.5">{toolbar}</div>
        </div>
        {deviceContext ? (
          <div
            className="flex shrink-0 items-center justify-center bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground"
            data-page-editor-canvas-context={deviceContext.value}
          >
            {deviceContext.label}
          </div>
        ) : null}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {canvas}
          {panelOpen && panel ? (
            <div
              {...panelDataProps}
              ref={panelRef}
              role="region"
              className={PANEL_POSITION_CLASS[panelPosition ?? "right"]}
              aria-label={panelAriaLabel}
            >
              {panel}
            </div>
          ) : null}
          {!panelOpen ? reopenAffordance : null}
        </div>
      </div>
    </>
  );
}
