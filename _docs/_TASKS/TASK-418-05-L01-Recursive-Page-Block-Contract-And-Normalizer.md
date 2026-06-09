# TASK-418-05-L01: Recursive Page Block Contract And Normalizer
# FileName: TASK-418-05-L01-Recursive-Page-Block-Contract-And-Normalizer.md

**Parent Subtask:** TASK-418-05
**Priority:** High
**Category:** Pages / Domain Contract
**Estimated Effort:** Large
**Dependencies:** TASK-418-03
**Status:** ⏳ To Do

---

## Overview

Extend `PageBlockV2` with a bounded recursive slot model owned by
`pageDocumentV2`. Only container-capable block types may own slots. Existing
flat documents must remain valid and normalize without destructive rewrites.

---

## Implementation Pseudocode

```ts
const PAGE_BLOCK_MAX_TREE_DEPTH = 4; // top-level section block is depth 1

type PageBlockSlotKey = "children" | "header" | "body" | "footer" | `column:${number}`;

type PageBlockV2 = {
  id: string;
  type: PageBlockType;
  props: Record<string, unknown>;
  style?: PageBlockStyleV2;
  visibility: PageBlockVisibilityV2;
  responsive?: Partial<Record<"tablet" | "mobile", PageBlockResponsiveOverrideV2>>;
  slots?: Partial<Record<PageBlockSlotKey, PageBlockV2[]>>;
};

function normalizeBlock(value, mode, path, depth = 1) {
  if (depth > PAGE_BLOCK_MAX_TREE_DEPTH) throw new PageDocumentError("page_document_invalid", path);
  const block = normalizeFlatBlockFields(value, mode, path);
  const capabilities = pageBlockCapabilities[block.type];
  const slots = normalizeSlots(value.slots, capabilities.slots, mode, path, depth + 1);
  return slots ? { ...block, slots } : block;
}
```

Expected data flow:

- Domain owner defines slot-capable block types and allowed slot keys.
- Domain owner defines `PAGE_BLOCK_MAX_TREE_DEPTH = 4`, counted with top-level
  section blocks as depth 1.
- Normalizer recursively validates blocks, props, styles, visibility, and
  responsive overrides.
- Published sanitizer strips unsafe/unpublished-only metadata recursively.

Error handling:

- Reject unknown slot keys in strict write mode.
- Reject slots on non-container block types.
- Enforce max depth and max children per slot.
- Prevent duplicate ids in a normalized document.

Regression-test shape:

- Existing flat `sections[].blocks[]` documents still normalize.
- Valid container slots normalize recursively.
- Too-deep trees, invalid slots, slots on atom blocks, and unknown fields are
  rejected.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages writes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages write permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** strict recursive validation with depth/slot/unknown-field
  rejection.
- **Anti-abuse controls:** cycle prevention, max depth, max child counts, and
  duplicate-id detection prevent unbounded payload abuse.

---

## Testing Requirements

- Vitest pure domain tests for recursive normalizer and strip-published logic.
- Vitest tests for duplicate ids and depth/slot rejection.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
