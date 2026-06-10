# TASK-449-01-L01: Reproduce Columns Save Drop Across Write Read And Publish
# FileName: TASK-449-01-L01-Reproduce-Columns-Save-Drop-Across-Write-Read-And-Publish.md

**Parent Subtask:** TASK-449-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-449-01
**Status:** ⏳ To Do

---

## Overview

Build the failing reproduction that proves exactly where `columns` is lost
between editor insert, write normalization, stored read normalization, and
published runtime output.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
const document = buildMinimalPageWithColumns();
const written = normalizePageDocumentV2ForWrite(document);
const stored = normalizeStoredPageDocumentV2ForRead(written);
const published = toPublishedPageDocumentV2(written);

expect(findBlockTypes(stored)).toContain("columns");
expect(findBlockTypes(published)).toContain("columns");
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Capture exact editor-produced default slots.
- Compare behavior with `container` and `group`.
- Record the first layer that drops the block.

Error handling:

- Unknown slot shapes remain explicit failures, not silent drops.
- Editor defaults are treated as valid inputs.

Regression-test shape:

- Vitest round-trip reproduction for default and nested-child columns cases.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** reproduction must stay within schema-owner write/read paths.

---

## Testing Requirements

- New Vitest coverage for the failing columns round trip.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
