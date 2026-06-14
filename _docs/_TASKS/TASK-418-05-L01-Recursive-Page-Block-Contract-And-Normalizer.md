# TASK-418-05-L01: Recursive Page Block Contract And Normalizer
# FileName: TASK-418-05-L01-Recursive-Page-Block-Contract-And-Normalizer.md

**Parent Subtask:** TASK-418-05
**Priority:** High
**Category:** Pages / Domain Contract
**Estimated Effort:** Large
**Dependencies:** TASK-418-02-L04
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

---

## Overview

Extend `PageBlockV2` with a bounded recursive slot model owned by
`pageDocumentV2`. Only container-capable block types may own slots. Existing
flat documents must remain valid and normalize without destructive rewrites.

---

## Implementation Pseudocode

```ts
const PAGE_BLOCK_MAX_TREE_DEPTH = 4; // top-level section block is depth 1
const PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24;

type PageBlockSlotKey = "children" | "header" | "body" | "footer" | `column:${number}`;
type PageLayoutBlockType = "container" | "columns" | "group";

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
- Current L01 scope freezes the initial layout block matrix:
  - `container`: props `{}`; default `{}`; slots `["children"]`.
  - `columns`: props `{ count, gap, distribution }`; defaults
    `{ count: 2, gap: 24, distribution: "equal" }`; `count` is clamped to
    `1..4`, `gap` to `0..120`, and `distribution` is `"equal" | "auto"`;
    slots `["column:1", "column:2", "column:3", "column:4"]`.
  - `group`: props `{ direction, wrap, gap }`; defaults
    `{ direction: "column", wrap: false, gap: 16 }`; `direction` is
    `"row" | "column"`, `wrap` is boolean, and `gap` is clamped to `0..120`;
    slots `["children"]`.
  - Future examples from the parent overview (`stack`, `tabs`, `accordion`, and
    card-like slot owners) are out of scope until a dedicated follow-up extends
    this matrix.
- `pageBlockCapabilities` must expose those slot lists from the domain owner.
  During L01, the new layout blocks normalize but remain
  `insertable: false`, `assistantEmittable: false`, and
  `runtimeRenderer: "placeholder"` with an explicit pending-nesting reason
  until L02/L03 add editor and runtime support.
- Domain owner defines `PAGE_BLOCK_MAX_TREE_DEPTH = 4`, counted with top-level
  section blocks as depth 1.
- Domain owner defines `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24`. L01 does not add
  a new total-node or top-level section/block cap so existing flat documents do
  not become invalid; existing request-size/API protections remain the outer
  payload bound.
- Normalizer recursively validates blocks, props, styles, visibility, and
  responsive overrides.
- `pageDocumentV2JsonSchema` represents the same slot/depth, allowed-prop,
  style, responsive, and unknown-field constraints used by the normalizer via a
  finite depth-unrolled block schema builder. Recursive schema nodes must not
  fall back to permissive `additionalProperties: true`; at depth
  `PAGE_BLOCK_MAX_TREE_DEPTH`, layout block schemas reject `slots`.
- L01 validates and stores nested responsive override records, but recursive
  responsive cascade resolution remains owned by TASK-418-05-L03.
- Published sanitizer strips unsafe/unpublished-only metadata recursively.

Error handling:

- Reject unknown slot keys in strict write mode.
- Reject slots on non-container block types.
- Reject slot children deeper than `PAGE_BLOCK_MAX_TREE_DEPTH` in strict write
  mode.
- Reject more than `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT` children in any slot in
  strict write mode.
- Prevent duplicate ids in a normalized write document.
- Detect cyclic object references during normalization. JSON payloads cannot
  encode cycles, but programmatic callers must not be able to create an
  unbounded traversal.
- Stored-read mode remains non-destructive for existing data:
  - flat documents continue to normalize as before,
  - malformed or unknown `slots` containers are dropped,
  - `slots` on non-layout blocks are dropped,
  - unknown slot keys are dropped,
  - over-depth descendants are dropped,
  - oversized slot arrays are clipped to `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT`,
  - duplicate block ids are deterministically de-duplicated after the first
    occurrence rather than rejecting the whole stored document,
  - cyclic branches are skipped.

Regression-test shape:

- Existing flat `sections[].blocks[]` documents still normalize.
- Valid container slots normalize recursively.
- Too-deep trees, invalid slots, slots on atom blocks, and unknown fields are
  rejected.
- AJV/schema tests reject invalid recursive slots, over-depth shapes, and
  unknown nested fields in parity with write normalization.
- Stored-read tests cover malformed slot pruning, duplicate-id de-duplication,
  and child clipping without resetting the full document.
- Capability tests prove the `container`/`columns`/`group` slot matrix and
  interim non-insertable/placeholder runtime state.

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
- Vitest AJV tests for depth-unrolled recursive schema parity.
- Targeted Bun Pages route validation coverage for recursive slot payload
  accept/reject behavior through the existing admin Page schemas.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_API.md`

---

## Closeout Notes

- Added bounded Page layout blocks `container`, `columns`, and `group` to the
  `pageDocumentV2` owner with strict prop defaults, option arrays, slot
  capability metadata, and interim non-insertable/placeholder runtime state.
- Extended `PageBlockV2` with `slots`, `PAGE_BLOCK_MAX_TREE_DEPTH = 4`, and
  `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24`.
- Reworked write normalization to validate slots recursively, reject unknown
  slot keys, reject slots on non-layout blocks, reject over-depth trees,
  reject oversized slots, reject duplicate block ids, and detect cyclic
  programmatic references.
- Kept stored-read normalization non-destructive: invalid slot containers,
  atom-block slots, unknown slot keys, over-depth descendants, and cyclic
  branches are pruned; oversized slots are clipped; duplicate block ids after
  the first occurrence are renamed deterministically.
- Updated `pageDocumentV2JsonSchema` to use finite depth-unrolled `$defs` so
  route schemas and direct AJV validation enforce the same recursive slot
  limits without a permissive nested fallback.
- Updated Page model/API/CMS docs and kept the editor/control registry type
  complete while hiding layout blocks from insertion until L02/L03 wire editor
  paths and runtime rendering.
- Pre-implementation audit `019eaf36-f457-7fd1-b1dd-309e658fb2ab` found real
  contract drift around the layout-block matrix, child limits, schema depth
  strategy, stored-read behavior, responsive-cascade ownership, and route
  validation. The task/report contract was corrected, then fresh audit
  `019eaf3d-3047-72a2-b85d-4a862ed0a1e1` reported no material drift before
  source edits.
- Post-implementation drift audit `019eaf4f-2492-7162-9257-f7e01b7dd25d`
  reported no high or medium material drift. Its only low finding was that
  `git diff --check` evidence was missing from closeout notes; that evidence is
  now recorded here, in the audit report, and in changelog 1153.
- Validation passed:
  `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts`
  (18 tests),
  `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-editor-control-registry.test.ts`
  (24 tests),
  `set -a && source .env && set +a && bun test tests/unit/pages/validation.test.ts`
  (11 tests),
  `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
  (30 tests),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.
