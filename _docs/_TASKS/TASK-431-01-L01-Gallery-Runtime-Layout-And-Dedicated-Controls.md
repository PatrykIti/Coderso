# TASK-431-01-L01: Gallery Runtime Layout And Dedicated Controls
# FileName: TASK-431-01-L01-Gallery-Runtime-Layout-And-Dedicated-Controls.md

**Parent Subtask:** TASK-431-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-431-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Implement truthful Gallery runtime behavior so section variants produce real
gallery/card layouts and pair that with the shared dedicated media/style
controls.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Variant is a top-level section field (`section.variant`, PageSectionV2 in
// core/services/pages/pageDocumentV2.ts:199); `section.layout` holds only
// columns/align/justify/maxWidth. Resolve it through the existing contract:
const template = resolvePageSectionTemplate(section); // pageSectionTemplates.ts:117
const galleryModel = resolveGallerySectionModel(template.section); // (new helper, to be created in core/services/pages/pageRendererV2.tsx)
return <GallerySectionRenderer model={galleryModel} variant={template.variant} />; // (new component, to be created in core/services/pages/pageRendererV2.tsx)
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

- Gallery variants change real runtime structure/classes.
- Inspector controls use the shared media, segmented, swatch, and toggle
  widgets.
- Existing section content remains valid inside the richer runtime layout.

Error handling:

- Unknown variants fall back to the registry `fallbackVariant` (`grid` for
  gallery, `core/services/pages/pageSectionTemplates.ts:70-73`) via
  `resolvePageSectionTemplate`.
- Missing gallery assets degrade to deterministic empty states.

Regression-test shape:

- Runtime coverage for Gallery variant output and UI coverage for dedicated
  controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Gallery fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Gallery runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
