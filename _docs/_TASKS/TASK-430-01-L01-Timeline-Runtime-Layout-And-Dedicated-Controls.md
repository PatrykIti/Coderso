# TASK-430-01-L01: Timeline Runtime Layout And Dedicated Controls
# FileName: TASK-430-01-L01-Timeline-Runtime-Layout-And-Dedicated-Controls.md

**Parent Subtask:** TASK-430-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-430-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Implement truthful Timeline runtime behavior so section variants produce real
timeline/milestone markup and pair that with the shared dedicated control
surface for timeline-specific options.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Real contract anchors (verified): the variant lives at section.variant
// (top-level on PageSectionV2 in core/services/pages/pageDocumentV2.ts),
// NOT section.layout.variant; resolve it via resolvePageSectionTemplate
// (core/services/pages/pageSectionTemplates.ts) to inherit the existing
// fallback/normalization path.
const template = resolvePageSectionTemplate(section);
const timelineModel = resolveTimelineSectionModel(section); // (new helper, to be created in core/services/pages/pageRendererV2.tsx)
return <TimelineSectionRenderer model={timelineModel} variant={template.variant} />; // (new renderer, to be created in core/services/pages/pageRendererV2.tsx)
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

- Timeline variants change real runtime structure/classes.
- Inspector controls use dedicated segmented/toggle/color widgets.
- Existing heading/text child content remains valid inside the richer layout.

Error handling:

- Unknown variants fall back to the safe default timeline layout.
- Missing timeline-specific data degrades to deterministic empty states.

Regression-test shape:

- Runtime coverage for variant output and UI coverage for timeline controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Timeline fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Timeline runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
