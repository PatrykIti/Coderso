# TASK-474-05: Editor View Page Parity And Modal Controls
# FileName: TASK-474-05-Editor-View-Page-Parity-And-Modal-Controls.md

**Parent Task:** TASK-474
**Priority:** High
**Category:** Admin UI / Custom Screens / Editor View
**Estimated Effort:** Large
**Dependencies:** TASK-474-01, TASK-474-02
**Status:** ⏳ To Do

---

## Overview

Bring the Editor View canvas to parity with the Pages editor: dock the control
panels to the floating toolbar (instead of a detached top-right box), upgrade the
command palette to a real focus-trapped dialog, and make the **advanced** control
groups (typography/style) open in modals. Owner decision (2026-06-21): only the
advanced groups become modals; simple controls stay inline in the attached panel.

## Current State (summary)

- `ScreenAuthoringCanvas.tsx` already uses `AuthoringCanvasFrame` +
  `AuthoringFloatingToolbar` + `AuthoringCommandPalette` + `AuthoringLayersPanel`
  (≈`:366-468`).
- `AuthoringCanvasFrame.tsx:38-42` renders the active panel as a **detached**
  absolute box at `right-4 top-4` — not docked to the toolbar like the Pages
  `FloatingEditorToolbar` (`core/admin/ui/pages/editor/FloatingEditorToolbar.tsx`).
- `AuthoringCommandPalette.tsx` is an absolute `inset-0` pseudo-dialog (no real
  focus trap / Escape semantics).
- `ScreenBlockInspector.tsx` renders advanced controls as inline form fields, not
  per-option modals.

## Sub-Tasks

- [ ] Switch `ScreenAuthoringCanvas` to the attached/expandable subpanel slot
  from TASK-474-01 (panels dock to the floating toolbar).
- [ ] Apply the neutral `canvasChrome` tokens for visual parity (selection ring,
  canvas surface) with the Pages editor.
- [ ] Upgrade `AuthoringCommandPalette` to a real `Dialog`/`Sheet`
  (`@/components/ui/dialog`) with focus trap and Escape/outside-click close;
  preserve keyboard insert (Enter) semantics.
- [ ] Wrap the advanced `ScreenBlockInspector` control groups (typography/style)
  in modal triggers; keep simple controls inline.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx` | Attached subpanel; shared `canvasChrome` tokens. |
| `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` | Advanced control groups open in modals; simple controls stay inline. |
| `core/admin/ui/authoring/AuthoringCommandPalette.tsx` | Real focus-trapped `Dialog`/`Sheet`. |
| `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx` | Panel-attached + palette focus-trap + modal-open coverage. |

## Implementation Pseudocode

```tsx
// ScreenAuthoringCanvas.tsx — dock panel to toolbar (no detached box)
<AuthoringCanvasFrame
  borderless
  toolbar={<AuthoringFloatingToolbar label={label} panels={panels} subpanel={activeSubpanel} />}
  commandPalette={<AuthoringCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} ... />}
>
  <ScreenRuntimeRenderer mode="builder" {...rendererProps} />
</AuthoringCanvasFrame>

// ScreenBlockInspector.tsx — advanced groups via modal
<Dialog>
  <DialogTrigger asChild><button>Typography</button></DialogTrigger>
  <DialogContent>{/* typography controls */}</DialogContent>
</Dialog>
// simple controls (e.g. label, visibility) render inline as today

// AuthoringCommandPalette.tsx — real dialog
<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
  <DialogContent onKeyDown={onPaletteKeyDown}>{commandList}</DialogContent>
</Dialog>
```

Data flow:

- The active subpanel is driven by the toolbar panel selection (state already in
  `ScreenAuthoringCanvas`); rendering moves from the detached box to the toolbar
  subpanel slot.
- Command palette open/close is controlled; insert actions unchanged.
- Modal-wrapped advanced groups still call the same inspector patch helpers.

Error handling:

- Dialog/Sheet must restore focus to the trigger on close and not steal canvas
  clicks (verify selection-clear semantics).
- Escape closes palette/subpanel without mutating selection.

Regression-test shape:

```tsx
test("editor view panel docks to the toolbar and palette traps focus", async () => {
  render(<CustomScreenEditorPage fixture={screenV4Fixture} initialTab="editor-view" />);
  await user.click(screen.getByRole("button", { name: "Content" }));
  expect(screen.getByTestId("authoring-toolbar-subpanel")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.queryByTestId("authoring-toolbar-subpanel")).toBeNull();
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints — editor UI only; saves use existing
  Custom Screen definition routes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` to load; `content:write` to save definitions.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** existing admin write bucket.
- **Reject unknown validation:** definition writes continue through V4 normalizers.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** inspector/modal controls must not surface protected
  settings or privileged values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Live `playwright-cli`: Editor View panel docks to the toolbar; palette
  Escape/focus behave; advanced groups open in modals.
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (Editor View authoring UX).
- `_docs/ARCHITECTURE.md` (shared authoring chrome parity).

## Acceptance Criteria

1. Editor View panels render attached to the floating toolbar (not a detached
   top-right box); Escape and outside-click close them.
2. The command palette is a focus-trapped dialog; keyboard insert/close preserved.
3. The advanced (typography/style) control groups open in modals; simple controls
   stay inline.
4. Selection ring and canvas surface match the Pages editor via shared tokens;
   vitest, lint, and types are green.
