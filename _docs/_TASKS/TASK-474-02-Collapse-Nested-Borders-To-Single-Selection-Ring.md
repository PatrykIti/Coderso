# TASK-474-02: Collapse Nested Borders To Single Selection Ring
# FileName: TASK-474-02-Collapse-Nested-Borders-To-Single-Selection-Ring.md

**Parent Task:** TASK-474
**Priority:** High
**Category:** Admin UI / Custom Screens / Canvas Styling
**Estimated Effort:** Medium
**Dependencies:** TASK-474-01
**Status:** ⏳ To Do

---

## Overview

Remove the over-bordering the owner flagged ("everything is bordered"). Today a
single Custom Screen block renders up to four nested rounded frames. Reduce the
stack to **one** coherent surface with a single selection ring (from the
`selectionChrome` token in TASK-474-01) across builder and entry modes, without
regressing the read-only preview surfaces.

## Current State (summary)

The borders stack four deep for one block:

1. `AuthoringCanvasFrame.tsx:20` — outer `rounded-2xl border bg-muted/20`.
2. `ScreenRuntimeRenderer.tsx:365` — `<section>` `rounded-2xl border`.
3. `ScreenRuntimeRenderer.tsx:144-145` — block wrapper `rounded-xl border`.
4. `ScreenRuntimeRenderer.tsx:202/234/304/318/326` — inner content card
   (`record-header`/`field`/`field-group`/`columns`/`rich-text`).

Plus a builder-mode header bar with `border-b` (`ScreenRuntimeRenderer.tsx:179`).
Selection is `ring-2 ring-primary/35` (`:146` and `:367`). `ScreenRuntimeRenderer`
also serves `preview` mode and is consumed by `CustomScreenPreview.tsx` and the
workspace preview dialog, so changes must be mode-gated.

## Sub-Tasks

- [ ] Set `AuthoringCanvasFrame` to `borderless` in `ScreenAuthoringCanvas` and
  the entry frame inside `CustomScreenEntryEditor`.
- [ ] Drop the block-wrapper border and the inner content-card border so each
  block is one surface; keep at most one `selectionBorder({ level: "item" })`.
- [ ] Replace the section border with a lightweight grouping (label/handle), not
  a second frame; keep one `selectionBorder({ level: "container" })` for the
  selected section in builder mode.
- [ ] Restyle the builder header (`:179`) as a minimal drag handle, not a bordered
  bar.
- [ ] Mode-gate: `preview` mode keeps its current read-only look; verify
  `CustomScreenPreview` and the workspace preview dialog are unchanged.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | Collapse section/block/content borders to one `selectionBorder` ring; mode-gate preview. |
| `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx` | Use `AuthoringCanvasFrame borderless`. |
| `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | Use `AuthoringCanvasFrame borderless` around the entry canvas. |
| `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx` | Add a de-border DOM guard. |

## Implementation Pseudocode

```tsx
// ScreenRuntimeRenderer.tsx — block wrapper: one ring, no nested card
const wrapperClass = cn(
  "group relative transition",
  selectionBorder({ level: "item", selected, editing: false }),
  mode === "preview" && "rounded-xl" // preserve preview look
);
// record-header: drop inner `rounded-xl bg-muted/20` card; render content flat
// field/field-group/columns/rich-text: drop inner `rounded-xl border bg-card`,
//   keep padding only; the single wrapper ring is the only border.

// section: replace `rounded-2xl border` with a label row + optional container ring
<section className={cn("relative", mode === "builder" && selectionBorder({ level: "container", selected }))}>
```

Data flow:

- Border/selection styling is centralized on the `selectionChrome` token; the
  renderer stops composing ad-hoc border classes.
- `mode` continues to drive interactivity; only the chrome classes change.

Error handling:

- No behavioral change to selection/binding; purely presentational.
- `preview` branch is gated so non-editor surfaces keep their look.

Regression-test shape:

```tsx
test("a selected block renders exactly one border/ring ancestor", async () => {
  render(<CustomScreenEntryEditor fixture={screenWithRecordHeader} />);
  await user.click(screen.getByRole("button", { name: /record overview/i }));
  const selected = document.querySelector('[data-selected="true"]')!;
  const ringAncestors = selected.closest('[data-screen-section-id]')!
    .querySelectorAll('.rounded-xl, .rounded-2xl');
  expect(ringAncestors.length).toBeLessThanOrEqual(1);
});
```

## Security Contract

- **Endpoint visibility:** no endpoints — presentation-only change.
- **Auth / RBAC / CSRF / rate-limit:** unchanged.
- **Reject unknown validation:** N/A.
- **Anti-abuse controls:** none required.
- **Secret handling:** unchanged; no new data surfaces.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Live `playwright-cli` cross-check vs `/pages/:id` selection chrome.
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (Custom Screen canvas styling).

## Acceptance Criteria

1. A selected block in builder and entry modes renders exactly one selection ring
   with no nested rounded frames.
2. `record-header` no longer nests an inner card inside the block wrapper.
3. `preview` mode, `CustomScreenPreview`, and the workspace preview dialog are
   visually unchanged.
4. vitest, lint, and types are green.
