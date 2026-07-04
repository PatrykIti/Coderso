# TASK-468-03-L02: Neutral Canvas Frame And Selection Primitives
# FileName: TASK-468-03-L02-Neutral-Canvas-Frame-And-Selection-Primitives.md

**Parent Subtask:** TASK-468-03
**Priority:** High
**Category:** Admin UI / Authoring Architecture
**Estimated Effort:** Large
**Dependencies:** TASK-468-03-L01
**Status:** ✅ Done
**Completed:** 2026-06-21

---

## Overview

Extract the canvas frame, selection state, drag/drop shell, and viewport chrome
from Page Editor into neutral authoring primitives. The new primitives must be
document-agnostic and receive all domain behavior through adapters.

2026-06-21 completion: added `AuthoringCanvasFrame`,
`authoringSelection`, and `AuthoringInsertionZone` as domain-neutral UI
primitives. Screen-specific selection and mutations remain in
`ScreenAuthoringCanvas` and `screenDocumentOps`.

## Sub-Tasks

- [ ] Create `core/admin/ui/authoring/` primitives for canvas frame, selection,
  viewport controls, empty state, and insertion zones.
- [ ] Move only domain-neutral UI and interaction code.
- [ ] Keep Page-specific section/block shape behind Page adapter props.
- [ ] Add typed adapter interfaces for document ids, selection targets, and
  canvas operations.
- [ ] Preserve Page Editor keyboard/drag behavior through adapter tests.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/authoring/AuthoringCanvasFrame.tsx` | New neutral canvas frame. |
| `core/admin/ui/authoring/authoringSelection.ts` | New neutral selection target helpers. |
| `core/admin/ui/authoring/authoringOperations.ts` | New adapter operation contracts. |
| `core/admin/ui/pages/editor/**` | Recompose Page Editor through Page adapter props. |
| `tests/vitest/ui-integration/authoring/**` | New neutral canvas tests. |

## Implementation Pseudocode

```tsx
export type AuthoringSelectionTarget =
  | { kind: "section"; id: string }
  | { kind: "block"; sectionId: string; id: string };

export interface AuthoringCanvasAdapter<TDocument> {
  document: TDocument;
  selection: AuthoringSelectionTarget | null;
  renderSection(sectionId: string): ReactNode;
  renderBlock(sectionId: string, blockId: string): ReactNode;
  operations: {
    select(target: AuthoringSelectionTarget | null): void;
    moveBlock(input: MoveAuthoringBlockInput): void;
    insertBlock(input: InsertAuthoringBlockInput): void;
  };
}
```

Data flow:

- Page Editor builds a Page adapter from Page v2 state.
- Custom Screens later build a Screen adapter from `ScreenDocumentV1`.
- Neutral components call adapter operations and never mutate domain state
  directly.

Error handling:

- Missing section or block ids render a bounded invalid-target state and clear
  stale selection through the adapter callback.
- Drag/drop reorder calls must clamp destination indices before delegating.
- Adapter exceptions surface through the existing admin error boundary.

Regression-test shape:

```tsx
test("selection target is domain-neutral", async () => {
  const adapter = createAuthoringAdapterFixture();
  render(<AuthoringCanvasFrame adapter={adapter} />);
  await user.click(screen.getByTestId("authoring-block-title"));
  expect(adapter.operations.select).toHaveBeenCalledWith({
    kind: "block",
    sectionId: "section-a",
    id: "title",
  });
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** adapters receive already-normalized documents.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** neutral primitives must not log document payloads or cache
  record data outside existing admin state.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/authoring`
- Page Editor focused UI regression suite.
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/PAGE_MODEL.md`

## Acceptance Criteria

1. Neutral canvas primitives live outside `pages/editor`.
2. Page Editor renders through adapters without behavior regressions.
3. Neutral modules have no imports from Page services, Custom Screens services,
   runtime widgets, DB, or server adapters.
