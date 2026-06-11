# TASK-452-01-L01: Add Source Of Truth Tests For Insertable Page Surfaces
# FileName: TASK-452-01-L01-Add-Source-Of-Truth-Tests-For-Insertable-Page-Surfaces.md

**Parent Subtask:** TASK-452-01
**Priority:** Medium
**Category:** Pages / Contract / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-452-01
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Add explicit owner-level tests that freeze the live-good catalog proven by the
cross-gating audit and prevent silent drift in insertable sections, insertable
blocks, or capability reasons.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
expect(insertableSectionTypes).toEqual([
  "hero", "content", "feature-grid", "media-split", "timeline",
  "gallery", "comparison", "faq", "testimonials", "cta", "custom",
]);

expect(editorInsertableBlockTypes).toEqual([
  "heading", "text", "button", "image", "video", "list", "card",
  "divider", "spacer", "statistic", "quote", "container", "columns", "group",
]);
```

Owner files:

- `core/services/pages/pageDocumentV2.ts`
- `core/admin/ui/pages/PageEditor.tsx`
- `tests/vitest/pages/page-editor-control-registry.test.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

Expected data flow:

- Tests read the owner registries directly.
- Gated entries remain explicit and documented by reason.
- Catalog changes require intentional task/doc updates.

Error handling:

- Unexpected entries fail tests rather than leaking into the palette.
- Placeholder-only block types remain non-insertable unless explicitly promoted.

Regression-test shape:

- Pure Vitest coverage for positive catalog and capability-reason assertions.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** not applicable.
- **RBAC:** not applicable.
- **CSRF:** not applicable.
- **Rate-limit bucket:** not applicable.
- **Validation:** tests must assert both allowed entries and explicit gated
  reasons.

---

## Testing Requirements

- Relevant pure Vitest coverage for Page owner registries.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Owner-level freeze tests landed 2026-06-11 in tests/vitest/pages/page-editor-control-registry.test.ts; catalogs derived via exported capability maps (private sets are not exported). Green.
