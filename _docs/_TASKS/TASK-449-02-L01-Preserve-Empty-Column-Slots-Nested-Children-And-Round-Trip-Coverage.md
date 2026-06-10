# TASK-449-02-L01: Preserve Empty Column Slots Nested Children And Round Trip Coverage
# FileName: TASK-449-02-L01-Preserve-Empty-Column-Slots-Nested-Children-And-Round-Trip-Coverage.md

**Parent Subtask:** TASK-449-02
**Priority:** High
**Category:** Pages / Page Editor V2 / Persistence
**Estimated Effort:** Large
**Dependencies:** TASK-449-02, TASK-449-01-L01
**Status:** ⏳ To Do

---

## Overview

Implement the actual persistence fix for `columns`, preserving empty slot arrays
and nested child blocks while adding the all-insertable-block round-trip guard
requested by the audit.

---

## Implementation Pseudocode

```ts
function normalizeColumnSlots(input, block) {
  return preserveKnownSlots(input, getPageBlockActiveSlotKeys(block), {
    keepEmptyArrays: true,
    preserveOverflowChildren: true,
  });
}

test("all insertable blocks survive round-trip", () => {
  for (const type of editorInsertableBlockTypes) expect(roundTrip(type)).toContain(type);
});
```

Expected data flow:

- Empty column slots remain persisted state.
- Nested child blocks survive write/read/publish.
- Count changes clamp active slots non-destructively.

Error handling:

- Unknown slot keys remain rejected unless explicitly mapped.
- No production-only fallbacks are added for tests.

Regression-test shape:

- Vitest round-trip coverage for default/populated columns and all insertable
  block types, plus Bun runtime HTML proof.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** slot handling stays inside `pageDocumentV2.ts` reject-unknown
  semantics.

---

## Testing Requirements

- Relevant Vitest round-trip suites and Bun runtime page tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

