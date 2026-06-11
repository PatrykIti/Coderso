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

Build the reproduction that proves exactly where `columns` is lost in the
live editor flow. The pure schema layer (`normalizePageDocumentV2ForWrite` →
`normalizeStoredPageDocumentV2ForRead` → `toPublishedPageDocumentV2`) and
route Ajv validation are verified green at HEAD `ae9dcc44` (empirical bun
round trip, 2026-06-11 drift audit), so the reproduction must exercise the
real save path: editor document state → `autosavePage`/`updatePage`
(`PageEditor.tsx:1537`/`:1550`) → route validation →
`pageService.preparePageData` → DB → reopen via cache/detail fetch, including
the stale-CSRF save-failure + cache-event rehydration path
(`PageEditor.tsx:1520-1554`) → publish. If the drop does not reproduce at
HEAD, record that result explicitly. Either way the recorded outcome gates
TASK-449-02: the fix contract may only target the layer recorded here.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// Schema-layer pin (verified green at HEAD ae9dcc44; NOT the failing
// reproduction — keep as a regression pin):
const document = buildMinimalPageWithColumns();
const written = normalizePageDocumentV2ForWrite(document);
const stored = normalizeStoredPageDocumentV2ForRead(written);
const published = toPublishedPageDocumentV2(written);

expect(findBlockTypes(stored)).toContain("columns");   // passes today
expect(findBlockTypes(published)).toContain("columns"); // passes today

// Live-path reproduction (the deliverable): replay insert → autosavePage/
// updatePage (PageEditor.tsx:1537/:1550) → route Ajv validation →
// pageService.preparePageData → DB → reopen via cache/detail fetch,
// including the stale-CSRF save-failure + cache-event rehydration path
// (PageEditor.tsx:1520-1554) → publish. Record the first layer that drops
// the block, or record "not reproducible at HEAD".
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
- Compare behavior with `container` and `group` (both persisted in the same
  audited session, so block-type-agnostic layers alone cannot explain the
  columns-specific drop).
- Record the first layer that drops the block, or record explicitly that the
  drop no longer reproduces at HEAD; this record is the hard gate for the
  TASK-449-02 fix contract.

Error handling:

- Unknown slot shapes remain explicit failures, not silent drops.
- Editor defaults are treated as valid inputs.

Regression-test shape:

- Vitest round-trip pin for default and nested-child columns cases (green
  today — pins schema-layer behavior), plus recorded live-path reproduction
  evidence.

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

- New Vitest coverage pinning the green columns round trip (schema layer),
  plus recorded live-path reproduction evidence or an explicit "not
  reproducible at HEAD" record.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
