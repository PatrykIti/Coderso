# TASK-432-01-L01: Comparison Runtime Guard And Dedicated Controls
# FileName: TASK-432-01-L01-Comparison-Runtime-Guard-And-Dedicated-Controls.md

**Parent Subtask:** TASK-432-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-432-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Keep the current truthful Comparison runtime behavior and adopt the shared
dedicated inspector controls without regressing grid/cards/default output.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Real symbols: resolvePageSectionTemplate (core/services/pages/pageSectionTemplates.ts:117)
// takes a full PageSectionV2 object, not a variant string; controls come from
// getPageEditorControlsForTarget / getPageSectionVariantControl
// (core/services/pages/pageEditorControlRegistry.ts:508 / :334) and are rendered in
// PageEditor.tsx via SectionRegistryControlField / RegistryControlField (~:2379 / :2524).
// Freeze the existing grid-vs-default geometry (md:grid-cols-2 + auto-rows-fr via
// pageRendererV2.tsx:189-194/:212 vs grid-cols-1), stripping the inert marker class so
// the guard targets real geometry rather than the always-different marker string:
const surface = (variant: PageSectionVariant) =>
  toPageSectionRenderProps({ ...section, variant })
    .contentClassName.replace(/page-section-template-\S+/g, "")
    .trim();
expect(surface("grid")).not.toEqual(surface("default"));
const controls = getPageEditorControlsForTarget({ kind: "section", type: "comparison" });
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageSectionTemplates.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Comparison variants continue to produce distinct published layouts.
- Inspector widgets upgrade without changing stored enum semantics.

Error handling:

- Unknown variants fall back to `default`.
- Control migration must not alter existing published markup unexpectedly.

Regression-test shape:

- Runtime coverage for Comparison variants and UI coverage for dedicated
  controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Comparison fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Comparison runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
