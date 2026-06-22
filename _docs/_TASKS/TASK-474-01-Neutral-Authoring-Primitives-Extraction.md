# TASK-474-01: Neutral Authoring Primitives Extraction
# FileName: TASK-474-01-Neutral-Authoring-Primitives-Extraction.md

**Parent Task:** TASK-474
**Priority:** High
**Category:** Admin UI / Authoring / Shared Primitives
**Estimated Effort:** Large
**Dependencies:** none (foundation for TASK-474-02..06)
**Status:** ⏳ To Do

---

## Overview

Extract the document-agnostic authoring primitives that both the Pages editor and
the Custom Screen editor need — inline canvas text editing, a single selection
border token, canvas-chrome style tokens, and an **attached** expandable toolbar
subpanel — into `core/admin/ui/authoring/*`. The import-boundary test forbids
custom-screens from importing `@/ui/pages` (and forbids the authoring package
from importing `/pages`, `services`, `customScreens`, widgets, db, server, or
Bun), so a neutral home is the only legal way to share behavior. This subtask
ships no user-facing change on its own; it is the foundation 474-02..06 consume.

## Current State (summary)

- `core/admin/ui/authoring/index.ts` exports `AuthoringCanvasFrame`,
  `AuthoringCommandPalette`, `AuthoringFloatingToolbar`, `AuthoringInsertionZone`,
  `AuthoringLayersPanel` — but **no** inline-edit primitive and **no** selection
  token.
- Inline canvas editing lives only in the Pages editor
  (`core/admin/ui/pages/editor/PageAuthoringCanvas.tsx`, the
  `InlineEditableCanvasText` region) and `core/services/pages/pageInlineEditContract.ts`
  — both boundary-forbidden for custom-screens.
- Selection ring is hand-rolled (`ScreenRuntimeRenderer.tsx:146` and `:367`,
  `ring-2 ring-primary/35`) and diverges from the Pages outline+ring.
- Canvas/control style tokens live in `core/admin/ui/pages/editorControls/controlChrome.ts`
  (boundary-forbidden).
- `AuthoringCanvasFrame.tsx:38-42` renders `floatingPanel` as a **detached**
  absolute box at `right-4 top-4`, not docked to the toolbar.
- Boundary contract: `tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
  (first test: `core/admin/ui/authoring` must stay UI-only).

## Sub-Tasks

- [ ] Add `InlineEditWrapper` (contentEditable + `onCommit` + Enter/Escape/blur),
  with **no** `PageBlockV2` / `services/pages` dependency.
- [ ] Add `selectionChrome` token helper (level `container | item`, `selected`,
  `editing`) producing one ring, replacing hand-rolled ring classes.
- [ ] Add neutral `canvasChrome` token module mirroring `controlChrome.ts`
  (surface, dotted canvas, panel) without importing the Pages copy.
- [ ] Add a `borderless` opt-out prop to `AuthoringCanvasFrame` (default keeps
  current behavior) and an attached/expandable subpanel slot on
  `AuthoringFloatingToolbar` / `AuthoringCanvasFrame`.
- [ ] Extend the boundary test to also forbid the new modules importing `/pages`,
  `services`, `customScreens`, widgets, db, server, or Bun.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/authoring/InlineEditWrapper.tsx` *(new)* | UI-only inline contentEditable primitive. |
| `core/admin/ui/authoring/selectionChrome.ts` *(new)* | `selectionBorder()` classMap (one ring). |
| `core/admin/ui/authoring/canvasChrome.ts` *(new)* | Neutral canvas/panel style tokens. |
| `core/admin/ui/authoring/AuthoringCanvasFrame.tsx` | `borderless` prop; attached subpanel slot instead of detached box. |
| `core/admin/ui/authoring/AuthoringFloatingToolbar.tsx` | Attached expandable subpanel adjacent to the toolbar. |
| `core/admin/ui/authoring/index.ts` | Export the new primitives. |
| `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` | Extend forbidden-import coverage to the new modules. |
| `tests/vitest/ui/authoring/authoringPrimitives.test.tsx` *(new)* | Render/behavior coverage for the primitives. |

## Implementation Pseudocode

```tsx
// InlineEditWrapper.tsx — UI-only; fail-closed when not editable
export function InlineEditWrapper({
  value, editable, onCommit, as: Tag = "span", className, ariaLabel,
}: {
  value: string; editable: boolean; onCommit: (next: string) => void;
  as?: keyof JSX.IntrinsicElements; className?: string; ariaLabel?: string;
}) {
  if (!editable) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag
      role="textbox" aria-label={ariaLabel} className={className}
      contentEditable suppressContentEditableWarning
      onBlur={(e) => { const next = e.currentTarget.textContent ?? ""; if (next !== value) onCommit(next); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === "Escape") { e.currentTarget.textContent = value; e.currentTarget.blur(); }
      }}
    >{value}</Tag>
  );
}

// selectionChrome.ts
export const selectionBorder = ({ level, selected, editing }:
  { level: "container" | "item"; selected?: boolean; editing?: boolean }) =>
  cn("rounded-xl transition",
     editing ? "ring-2 ring-primary outline-none"
     : selected ? "ring-2 ring-primary/40"
     : level === "item" ? "ring-1 ring-transparent hover:ring-border" : "");
```

Data flow:

- Primitives are pure UI; callers pass value + editable + commit handlers.
- `AuthoringCanvasFrame` owns at most one frame; `borderless` drops the outer
  border so the renderer can own the single selection ring.
- The attached subpanel renders adjacent to the floating toolbar; selection state
  comes from the caller (no internal document coupling).

Error handling:

- `InlineEditWrapper` renders plain (non-editable) markup when `editable` is
  false — read-only/unbound callers cannot accidentally expose editing.
- Escape restores the original value before blur (no partial commit).
- No service/Bun imports; the boundary test guards regressions.

Regression-test shape:

```tsx
test("InlineEditWrapper commits on Enter and is read-only when disabled", async () => {
  const onCommit = vi.fn();
  const { rerender } = render(<InlineEditWrapper value="A" editable onCommit={onCommit} />);
  const box = screen.getByRole("textbox");
  box.textContent = "B"; await user.type(box, "{Enter}");
  expect(onCommit).toHaveBeenCalledWith("B");
  rerender(<InlineEditWrapper value="A" editable={false} onCommit={onCommit} />);
  expect(screen.queryByRole("textbox")).toBeNull();
});
```

## Security Contract

- **Endpoint visibility:** no endpoints — UI-only primitives.
- **Auth model:** unchanged — no network surface.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** N/A — UI-only primitives, no endpoint.
- **Reject unknown validation:** N/A at this layer; primitives do not persist.
- **Anti-abuse controls:** none required.
- **Secret handling:** primitives must not read settings, credentials, or
  privileged values; the boundary test forbids `services`, `db`, `server`, and
  `Bun` imports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/authoring/authoringPrimitives.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (neutral authoring primitives + boundary rationale).

## Acceptance Criteria

1. `core/admin/ui/authoring` exports `InlineEditWrapper`, `selectionBorder`, and
   neutral canvas-chrome tokens, all UI-only.
2. `AuthoringCanvasFrame` supports a `borderless` mode (default preserves current
   behavior) and an attached toolbar subpanel slot.
3. The boundary test passes and now also guards the new modules.
4. vitest, lint, and types are green.
