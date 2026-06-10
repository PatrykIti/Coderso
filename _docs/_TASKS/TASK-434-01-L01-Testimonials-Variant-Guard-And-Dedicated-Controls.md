# TASK-434-01-L01: Testimonials Variant Guard And Dedicated Controls
# FileName: TASK-434-01-L01-Testimonials-Variant-Guard-And-Dedicated-Controls.md

**Parent Subtask:** TASK-434-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-434-01
**Status:** ⏳ To Do

---

## Overview

Keep the current Testimonials runtime behavior truthful and adopt the shared
dedicated controls without regressing the published variant markers/default
layout path.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
expect(resolveTestimonialsTemplate("default")).not.toEqual(resolveTestimonialsTemplate("grid"));
renderSectionPanels(getSectionControlsForType("testimonials"));
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

- Testimonials variants keep their current published behavior.
- Inspector widgets upgrade without changing stored enum semantics.

Error handling:

- Unknown variants fall back to the safe default.
- Control migration must not alter current runtime markup unexpectedly.

Regression-test shape:

- Runtime coverage for Testimonials variants and UI coverage for dedicated
  controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Testimonials fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Testimonials runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
