# TASK-428-01-L01: Feature Grid Runtime Guard And Dedicated Controls
# FileName: TASK-428-01-L01-Feature-Grid-Runtime-Guard-And-Dedicated-Controls.md

**Parent Subtask:** TASK-428-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-428-01
**Status:** ⏳ To Do

---

## Overview

Keep the current truthful `cards`/`grid` runtime path for Feature Grid and
verify the Feature Grid panels render the shared dedicated control widgets.
The dedicated widget rendering itself is owned by TASK-421
(TASK-421-02-L01/L02 primitives, TASK-421-03-L01 section preset panels);
Feature Grid has no section-specific control surface —
`getPageEditorControlsForTarget` returns only `pageUniversalSectionControls`
plus the generic variant select — so this leaf is runtime guard plus
adoption verification, not widget implementation.

---

## Sub-Tasks

- [ ] Implement the scoped verification/guard work described below (no widget
      implementation — that is TASK-421 scope).
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Real contract anchors (verified):
// - resolvePageSectionTemplate(section) in core/services/pages/pageSectionTemplates.ts
// - getPageEditorControlsForTarget({ kind, type }) in core/services/pages/pageEditorControlRegistry.ts
// Runtime guard: cards/grid resolve distinctly and keep their layout classes.
expect(resolvePageSectionTemplate({ ...section, variant: "cards" }).variant).toBe("cards");
expect(resolvePageSectionTemplate({ ...section, variant: "cards" }).variant).not.toBe(
  resolvePageSectionTemplate({ ...section, variant: "default" }).variant
);
// Adoption verification: feature-grid sections expose only the shared
// controls (pageUniversalSectionControls + the generic variant select).
const controls = getPageEditorControlsForTarget({ kind: "section", type: "feature-grid" });
// Render `controls` through the shared editor control renderers
// (RegistryControlField / SectionRegistryControlField in
// core/admin/ui/pages/PageEditor.tsx) and assert the dedicated TASK-421
// widgets appear instead of native SelectField/TextField fallbacks.
```

Owner files (verification surface — widget implementation is TASK-421 scope):

- `tests/vitest/pages/page-renderer-v2.test.tsx`
- `tests/vitest/pages/page-editor-control-registry.test.ts`
- `core/services/pages/pageEditorControlRegistry.ts` (only if the feature-grid
  descriptor metadata needs adjusting; no new widget code)

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Feature Grid variants keep producing distinct runtime layouts.
- Inspector controls render the shared dedicated widgets owned by
  TASK-421-02/TASK-421-03-L01 without changing stored enum semantics; this
  leaf verifies adoption only.

Error handling:

- Unknown variants fall back to the registry `fallbackVariant` (`default` for
  feature-grid) via `resolvePageSectionTemplate`.
- Control migration must not alter current published markup unexpectedly.

Regression-test shape:

- Runtime coverage for cards/grid/default and UI coverage for control widgets.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Feature Grid fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Feature Grid runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
