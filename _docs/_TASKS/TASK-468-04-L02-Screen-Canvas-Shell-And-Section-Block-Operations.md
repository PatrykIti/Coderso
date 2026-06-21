# TASK-468-04-L02: Screen Canvas Shell And Section Block Operations
# FileName: TASK-468-04-L02-Screen-Canvas-Shell-And-Section-Block-Operations.md

**Parent Subtask:** TASK-468-04
**Priority:** High
**Category:** Admin UI / Custom Screens / Canvas
**Estimated Effort:** Large
**Dependencies:** TASK-468-04-L01
**Status:** ✅ Done
**Completed:** 2026-06-21

---

## Overview

Build the Custom Screen authoring canvas over the neutral authoring primitives.
This leaf owns screen section/block insertion, reorder, duplicate, delete,
selection, and adapter mapping for `ScreenDocumentV1`.

2026-06-21 corrective closure: `ScreenDocumentV1` now owns real
`ScreenSectionV1` containers, `screenDocumentOps` traverses section blocks and
nested slots, and `ScreenAuthoringCanvas` adapts the document to neutral
authoring canvas, layers, command, toolbar, and insertion primitives.

## Sub-Tasks

- [ ] Add `ScreenAuthoringCanvas` as the Custom Screens adapter host.
- [ ] Add pure document operation helpers for sections and blocks.
- [ ] Wire canvas selection and layers to `ScreenDocumentV1` ids.
- [ ] Add empty-state insertion flows for new screens.
- [ ] Add tests for insert, reorder, duplicate, delete, and stale selection
  cleanup.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx` | New screen canvas adapter. |
| `core/admin/ui/custom-screens/screenDocumentEditorOps.ts` | New pure V4 editor operations. |
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | Mount screen canvas shell. |
| `tests/vitest/customScreens/screenDocumentEditorOps.test.ts` | Pure operation tests. |
| `tests/vitest/ui-integration/custom-screens/*Canvas*.test.tsx` | UI operation tests. |

## Implementation Pseudocode

```ts
export function insertScreenBlock(
  document: ScreenDocumentV1,
  input: InsertScreenBlockInput
): ScreenDocumentV1 {
  const section = requireScreenSection(document, input.sectionId);
  const block = createScreenBlock(input.block);
  return replaceScreenSection(document, {
    ...section,
    blocks: insertAt(section.blocks, clampIndex(input.index, section.blocks.length), block),
  });
}

export function removeScreenBlock(document: ScreenDocumentV1, blockId: string) {
  return mapScreenSections(document, (section) => ({
    ...section,
    blocks: section.blocks.filter((block) => block.id !== blockId),
  }));
}
```

Data flow:

- Editor model passes normalized V4 document into `ScreenAuthoringCanvas`.
- Canvas adapter translates neutral authoring operations into pure V4 helpers.
- Helpers return a new document; reducer stores it as the local draft.

Error handling:

- Unknown section/block ids no-op with explicit editor warnings in development
  and safe user-visible stale-selection clearing in production.
- Reorder destinations are clamped to valid section/block bounds.
- Delete removes or invalidates bindings through a follow-up operation contract,
  never by leaving dangling writable bindings.

Regression-test shape:

```ts
test("removing a block clears selection and dangling binding", () => {
  const result = removeScreenBlockWithBindings(fixture, "title-block");
  expect(findScreenBlock(result.document, "title-block")).toBeNull();
  expect(result.bindings).not.toContainEqual(expect.objectContaining({ blockId: "title-block" }));
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged until save route is called.
- **CSRF expectations:** unchanged until save route is called.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** operation helpers only create schema-owned
  section/block shapes.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** canvas state must not include protected field values; it
  only references field names/bindings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/screenDocumentEditorOps.test.ts`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md`

## Acceptance Criteria

1. Screen canvas uses neutral authoring primitives through a Screen adapter.
2. Section/block operations are pure, tested, and preserve valid V4 documents.
3. Deleting or moving blocks cannot leave active dangling writable bindings.
