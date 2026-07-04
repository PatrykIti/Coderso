# TASK-479-06-L06: CanvasEditor Floating-Panel Pattern + Show/Hide Toggle
# FileName: TASK-479-06-L06-CanvasEditor-Floating-Panel-Pattern.md

**Priority:** Medium
**Category:** Admin UI / Shell / Editor Surface
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06-L01 (Button soft/ghost + sizes), TASK-479-06-L02 (patterns), TASK-479-06-L05 (EditorShell canvas host)
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-06

---

## Overview

- **Goal:** Add a shared `CanvasEditor` under `core/admin/ui/shared`: an
  **interactive canvas** (preview surface that scrolls internally) plus a **single
  floating control panel** — either a right inspector or a bottom toolbar — with a
  **show/hide toggle** and a reopen affordance. This is the Page Editor V2 model
  (floating panel = sole control surface, no permanent side rails) and is meant to
  be reused by the page, post, custom-screen entry-view, entry-content, and
  page-template editors. Also expose the `BlockChip` palette helper.
- **Owning module/service:** `core/admin/ui/shared/CanvasEditor.tsx` (new),
  consumed inside `EditorShell variant="canvas"` (L05).
- **Source-of-truth docs:** `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`
  (port source); memory "Page Editor V2 vision" + "Floating panel control UX
  feedback" (segmented controls scroll horizontally; click selects innermost
  block; transparent is first-class).
- **Out of scope:** Rewiring any real editor onto `CanvasEditor` (→ TASK-479-07
  / per-editor tasks); the inline mark/color toolbar fixes (TASK-475..478);
  block drag-drop logic; real undo/redo behavior (the chrome buttons are slots
  the host wires). This leaf delivers the **reusable shell pattern**, not editor
  logic.

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). `CanvasEditor` is a presentational shell —
the host editor keeps all data, dirty-state, autosave, and cache behavior. The
pattern must NOT introduce any state that overwrites a host's dirty buffer and
must NOT trigger refetches on mount.

## Implementation Pseudocode

Port `patterns/CanvasEditor.tsx` onto real imports (`@/components/ui/button`,
`@/lib/utils` `cn`, lucide icons). Slot-based: the host passes `canvas`, `panel`,
`toolbar`, `panelTitle`, etc. Panel open/close is the component's only state.

### `core/admin/ui/shared/CanvasEditor.tsx`

```tsx
type CanvasEditorProps = {
  title?: React.ReactNode;
  badge?: React.ReactNode;                 // e.g. status pill
  toolbar?: React.ReactNode;               // host-provided chrome controls (slot)
  device?: boolean;                        // show desktop/mobile preview segmented control
  canvas: React.ReactNode;                 // the interactive preview surface (host-owned)
  panel: React.ReactNode;                  // the single floating control panel body (host-owned)
  panelTitle?: React.ReactNode;
  panelPosition?: "right" | "bottom";      // right inspector OR bottom toolbar
  panelClassName?: string;
  className?: string;
  defaultPanelOpen?: boolean;              // lazy init only — NO sync setState in effects
};

export function CanvasEditor({ panelPosition = "right", device = true, defaultPanelOpen = true, ... }: CanvasEditorProps) {
  const [panelOpen, setPanelOpen] = useState(defaultPanelOpen); // lazy init (ESLint react-hooks safe)

  return (
    <div className={cn("flex h-[calc(100vh-12rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card", className)}>
      {/* Chrome bar: title + badge, host toolbar slot, undo/redo slots, device segmented, panel show/hide */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2"><span className="text-sm font-medium">{title}</span>{badge}</div>
        <div className="flex items-center gap-1.5">
          {toolbar}
          {/* Undo/Redo are slots the host wires to its real history; default = disabled ghost icon buttons */}
          {device ? <DeviceSegmented /> : null}
          <Button variant={panelOpen ? "soft" : "ghost"} size="sm" className="gap-1.5"
            onClick={() => setPanelOpen(v => !v)} aria-pressed={panelOpen}
            aria-label={panelOpen ? "Hide panel" : "Show panel"}>
            <PanelRight className="size-4" /><span className="hidden sm:inline">{panelOpen ? "Hide panel" : "Panel"}</span>
          </Button>
        </div>
      </div>

      {/* Canvas + overlaid single floating panel */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto bg-dotted p-6 lg:p-8">{canvas}</div>
        {panelOpen ? (
          <div className={cn("absolute z-20",
            panelPosition === "right" && "right-4 top-4 w-[280px]",
            panelPosition === "bottom" && "bottom-5 left-1/2 -translate-x-1/2", panelClassName)}>
            <div className="overflow-hidden rounded-2xl border border-border bg-popover shadow-pop">
              {panelTitle ? <PanelHeader onHide={() => setPanelOpen(false)} title={panelTitle} /> : null}
              <div className={panelPosition === "right" ? "max-h-[58vh] overflow-y-auto" : ""}>{panel}</div>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setPanelOpen(true)}
            className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop hover:text-primary">
            <SlidersHorizontal className="size-3.5" /> Show panel
          </button>
        )}
      </div>
    </div>
  );
}

// Palette chip for "add block" inside floating panels (port proto BlockChip).
export function BlockChip({ icon, label }: { icon: React.ReactNode; label: string }) { /* rounded-xl button */ }
```

**Data flow:** the host editor owns `canvas` (its block tree/preview) and `panel`
(its controls), and wires `toolbar`/undo/redo to its real history + autosave.
`CanvasEditor` owns only `panelOpen` (lazy `useState`, toggled by user events) —
never derived from props in an effect, never reset on the host's data changes.
Reused by page/post/screen/template editors which mount it inside
`EditorShell variant="canvas"` (L05).

**Error handling:** purely presentational; renders whatever slots it is given. If
`panel` is absent, the show/hide control + reopen affordance still render without
throwing. No async, no fetch, no global side effects.

**Regression-test shape:** (L07)
- Renders chrome + canvas + panel; clicking "Hide panel" removes the panel and
  shows the "Show panel" reopen affordance; clicking it restores the panel.
- `panelPosition="bottom"` positions the floating panel centered at the bottom.
- `aria-pressed` reflects panel state; the toggle is keyboard-activatable.
- Host-provided `toolbar`/`badge` slots render; `device={false}` hides the
  segmented preview control.
- No `useEffect`-driven `setState` (lint guard) — panel state survives a host
  data re-render without resetting.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/canvas-editor` (added in L07)

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/UI/` editor reference — document `CanvasEditor` (slots, panelPosition,
  show/hide) as the shared Page Editor V2 surface for future editor adoption.
- Cross-link from the Page Editor V2 vision notes that the shared surface now
  exists in `core/admin/ui/shared/CanvasEditor.tsx`.
- `_docs/_CHANGELOG/` entry on closure linking TASK-479 + TASK-479-06-L06.
