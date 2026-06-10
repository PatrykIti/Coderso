# TASK-449-01: Columns Round-Trip Reproduction And Contract Freeze
# FileName: TASK-449-01-Columns-Round-Trip-Reproduction-And-Contract-Freeze.md

**Parent Task:** TASK-449
**Priority:** High
**Category:** Pages / Page Editor V2 / Contract
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Reproduce the `columns` disappearance deterministically and freeze the owning
contract before changing persistence logic. This subtask owns the failing
round-trip proof from `_docs/AUDIT/columns-2026-06-10.md` and narrows the exact
layer that strips the block: editor payload, write normalization, slot
normalization, read normalization, or publish.

---

## Implementation Pseudocode

```ts
test("columns survives write/read/publish round-trip", () => {
  const document = buildMinimalPageWithColumns();
  const written = normalizePageDocumentV2ForWrite(document);
  const stored = normalizeStoredPageDocumentV2ForRead(written);
  const published = toPublishedPageDocumentV2(written);

  expect(findBlockTypes(stored)).toContain("columns");
  expect(findBlockTypes(published)).toContain("columns");
});
```

Expected data flow:

- Capture the exact default editor output for an inserted `columns` block.
- Prove where the block disappears.
- Freeze the slot-shape and count-shrink expectations before implementation.

Error handling:

- Keep genuine malformed-input errors machine-readable.
- Default editor-produced data must not be classified invalid.

Regression-test shape:

- Vitest round-trip coverage for default and populated columns blocks.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** fix must stay within `pageDocumentV2.ts` reject-unknown rules.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- New Vitest coverage for default `columns` round-trip.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if slot semantics are clarified

