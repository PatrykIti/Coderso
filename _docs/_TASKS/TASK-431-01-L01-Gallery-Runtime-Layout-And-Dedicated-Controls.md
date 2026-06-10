# TASK-431-01-L01: Gallery Runtime Layout And Dedicated Controls
# FileName: TASK-431-01-L01-Gallery-Runtime-Layout-And-Dedicated-Controls.md

**Parent Subtask:** TASK-431-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-431-01
**Status:** ⏳ To Do

---

## Overview

Implement truthful Gallery runtime behavior so section variants produce real
gallery/card layouts and pair that with the shared dedicated media/style
controls.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
const galleryModel = resolveGallerySectionModel(section);
return <GallerySectionRenderer model={galleryModel} variant={section.layout.variant} />;
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

- Unknown variants fall back to `default`.
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
