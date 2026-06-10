# TASK-433-01-L01: FAQ Compact Runtime And Dedicated Controls
# FileName: TASK-433-01-L01-FAQ-Compact-Runtime-And-Dedicated-Controls.md

**Parent Subtask:** TASK-433-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-433-01
**Status:** ⏳ To Do

---

## Overview

Keep the current truthful FAQ `compact` runtime path and adopt the shared
dedicated inspector controls without regressing published layout behavior.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
expect(resolveFaqTemplate("compact")).not.toEqual(resolveFaqTemplate("default"));
renderSectionPanels(getSectionControlsForType("faq"));
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

- FAQ compact keeps a real published-layout effect.
- Inspector widgets upgrade without changing stored enum semantics.

Error handling:

- Unknown variants fall back to `default`.
- Control migration must not alter existing FAQ markup unexpectedly.

Regression-test shape:

- Runtime coverage for FAQ variants and UI coverage for dedicated controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned FAQ fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- FAQ runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
