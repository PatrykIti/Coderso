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

Make the Testimonials variant contract truthful on the published front: `cards`
and `grid` currently resolve to identical geometry (`md:grid-cols-3
auto-rows-fr`; only the unconsumed marker class differs), so give `cards` a
visibly distinct per-item card surface while `grid` stays flat, and adopt the
shared dedicated controls without regressing the published variant
markers/default layout path.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Real mechanism today: pageSectionTemplateColumns (pageRendererV2.tsx:181-188) forces
// Math.max(columns, 3) for BOTH grid and cards (-> md:grid-cols-3), and
// pageSectionTemplateClass emits `auto-rows-fr` for both (:210/:212); only the marker
// class `page-section-template-testimonials-<variant>` (:199) differs, with no CSS consumer.
// Fix: extend pageSectionTemplateClass / the testimonials render path so `cards` adds a
// per-item card surface (padding/border/shadow) and `grid` stays flat. Variant resolution
// stays on resolvePageSectionTemplate (pageSectionTemplates.ts:117 — full section object).
// Compare geometry/surface with the inert marker stripped, so the guard cannot pass on
// the marker string alone:
const surface = (variant: PageSectionVariant) =>
  toPageSectionRenderProps({ ...section, variant })
    .contentClassName.replace(/page-section-template-\S+/g, "")
    .trim();
expect(surface("cards")).not.toEqual(surface("grid"));
// guard the cards-vs-grid pair — identical today; must diverge via the cards surface
expect(surface("default")).not.toEqual(surface("grid"));
// preserve the existing default single-column distinction (columns: 1 vs forced 3)
const controls = getPageEditorControlsForTarget({ kind: "section", type: "testimonials" });
// pageEditorControlRegistry.ts:508; rendered via SectionRegistryControlField (PageEditor.tsx:2379)
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

- `cards` gains a visibly distinct published per-item card surface
  (padding/border/shadow); `grid` stays flat; `default` keeps its current
  single-column behavior and the marker classes keep switching.
- The cards-vs-grid difference must be visible on the published front, not a
  class-string or marker-only change.
- Inspector widgets upgrade without changing stored enum semantics.

Error handling:

- Unknown variants fall back to the registry `fallbackVariant` (`cards` for
  testimonials, `core/services/pages/pageSectionTemplates.ts:86-91`) via
  `resolvePageSectionTemplate`.
- Control migration must not alter current runtime markup beyond the intended
  cards surface change.

Regression-test shape:

- Runtime coverage asserting the cards-vs-grid pair produces distinct published
  geometry/surface (not only default-vs-grid), plus UI coverage for dedicated
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
