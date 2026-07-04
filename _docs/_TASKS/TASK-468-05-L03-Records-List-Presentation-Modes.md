# TASK-468-05-L03: Records List Presentation Modes
# FileName: TASK-468-05-L03-Records-List-Presentation-Modes.md

**Parent Subtask:** TASK-468-05
**Priority:** High
**Category:** Admin UI / Custom Screens / Records List
**Estimated Effort:** Large
**Dependencies:** TASK-468-05-L01
**Status:** ⏭️ Superseded
**Superseded Date:** 2026-06-20
**Supersession Reason:** User scope correction keeps the existing tabular
records list unchanged. Card/compact list presentation modes are out of scope
for TASK-468.

---

## Overview

This leaf is superseded. TASK-468 keeps the existing Custom Screen records table
unchanged and does not introduce table/card/compact presentation modes. V4 work
continues in the screen detail builder, entry-detail field editing canvas, and
compatibility projection around the current table list.

## Sub-Tasks

- [x] Preserve the existing table/list behavior.
- [x] Remove card/compact presentation modes from accepted TASK-468 scope.
- [ ] Keep current list config compatibility while V4 definition writes land.

## Files To Change

| File | Required change |
|---|---|
| Existing list files | Keep behavior unchanged except compatibility updates required by V4 definition projections. |

## Implementation Pseudocode

```ts
export type CustomScreenListViewDefinitionV4 = {
  // Superseded in TASK-468. Existing CustomScreenListViewDefinition remains
  // the table list contract for this family.
};
```

Data flow:

- Service/client keeps loading the existing table list definition.
- UI links records to the record workspace route without changing table
  presentation.

Error handling:

- Existing missing-field, sort, filter, pagination, and empty-state behavior is
  preserved.

Regression-test shape:

```tsx
test("list view omits deleted field and keeps record actions", () => {
  render(<CustomScreenEntriesTable fixture={listWithDeletedFieldFixture} />);
  expect(screen.queryByRole("columnheader", { name: "Deleted field" })).toBeNull();
  expect(screen.getAllByRole("link", { name: /Edit/ })).toHaveLength(2);
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen list and custom
  content record routes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for list and record reads.
- **CSRF expectations:** not required for read-only list requests; required for
  any inline mutations.
- **Rate-limit bucket:** existing admin read bucket.
- **Reject unknown validation:** existing list view definition reject-unknown
  behavior is preserved.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** list columns must not expose protected fields without the
  existing admin authorization model allowing them.

## Testing Requirements

- Existing list tests only if compatibility changes touch list behavior.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`

## Acceptance Criteria

1. No card/compact presentation mode code is added under TASK-468.
2. Existing table list behavior remains unchanged while V4 definition writes
   land.
3. Any future list presentation redesign is split into a new task.
