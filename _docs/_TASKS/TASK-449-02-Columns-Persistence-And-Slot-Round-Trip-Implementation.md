# TASK-449-02: Columns Persistence And Slot Round-Trip Implementation
# FileName: TASK-449-02-Columns-Persistence-And-Slot-Round-Trip-Implementation.md

**Parent Task:** TASK-449
**Priority:** High
**Category:** Pages / Page Editor V2 / Persistence
**Estimated Effort:** Large
**Dependencies:** TASK-449-01
**Status:** ⏳ To Do

---

## Overview

Fix the root cause that drops `columns` on save and make the slot contract
round-trip safely across insert, save, reopen, publish, and nested-child edits.
This subtask also adds the all-insertable-block regression guard so no sibling
block silently vanishes in the same way.

---

## Implementation Pseudocode

```ts
function normalizeBlockSlots(input, block, mode, path) {
  const activeKeys = getPageBlockActiveSlotKeys(block);
  return preserveKnownSlots(input, activeKeys, {
    keepEmptyArrays: true,
    preserveOverflowChildren: true,
    failClosedOnUnknownShapes: true,
  });
}

test("every editor-insertable block survives round-trip", () => {
  for (const type of editorInsertableBlockTypes) {
    expect(roundTrip(type)).toContain(type);
  }
});
```

Expected data flow:

- Empty column slot arrays remain valid persisted state.
- Nested child blocks in `column:N` slots survive read/write normalization.
- Count changes clamp active slot exposure without destructive child loss.

Error handling:

- Unknown slot keys remain rejected unless explicitly mapped.
- Editor defaults must never require production-only fallbacks.

Regression-test shape:

- Vitest for populated `column:1` / `column:2` children and all-insertable
  block round-trip coverage.
- Bun runtime proof that published HTML contains `data-page-block="columns"`.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** slot normalization stays schema-first and reject-unknown.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- New Vitest round-trip suite and relevant Bun page-render tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

