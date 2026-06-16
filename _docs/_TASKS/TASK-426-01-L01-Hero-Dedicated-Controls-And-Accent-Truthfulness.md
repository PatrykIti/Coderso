# TASK-426-01-L01: Hero Dedicated Controls And Accent Truthfulness
# FileName: TASK-426-01-L01-Hero-Dedicated-Controls-And-Accent-Truthfulness.md

**Parent Subtask:** TASK-426-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-426-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Adopt the shared dedicated inspector controls for Hero and verify that variant,
alignment, and background behavior remain truthful on the published front
instead of regressing into marker-only state. For accent, this leaf verifies
the post-TASK-439 flow: the section emits `--coderso-section-accent` from
`section.style.accent`, and the published button consumes the variable through
`toPageButtonElementStyle`.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
const heroControls = getPageEditorControlsForTarget({ kind: "section", type: "hero" });
// core/services/pages/pageEditorControlRegistry.ts:508
// Editor surface: section controls render through SectionRegistryControlField
// (core/admin/ui/pages/PageEditor.tsx ~2379-2523) using the shared TASK-421
// widgets; this leaf verifies the hero panels render them, it does not
// re-implement them.
// Published front: variant is top-level `section.variant`, resolved via
// resolvePageSectionTemplate(section) (core/services/pages/pageRendererV2.tsx:239);
// hero-side accent emission via toPageSectionStyle and button consumption via
// toPageButtonElementStyle.
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

- Hero inspector swaps native selects/text boxes for the shared TASK-421
  dedicated widgets.
- Accent/variant edits flow through the shared section update path; accent
  verification stays hero-side only (the section emits
  `--coderso-section-accent` from `section.style.accent`), while the visible
  accent-on-button application fix is owned by TASK-439-01-L01.
- Published front preserves real Hero-specific layout and styling behavior.

Error handling:

- Unknown Hero variants fall back to `default`.
- Missing accent tokens degrade to the current safe default.

Regression-test shape:

- Vitest UI coverage for Hero panels and runtime tests for variant output and
  hero-side accent emission (`--coderso-section-accent` present in the section
  style); visible accent-on-button assertions belong to TASK-439-01-L01.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Hero fields may be written.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Hero runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
