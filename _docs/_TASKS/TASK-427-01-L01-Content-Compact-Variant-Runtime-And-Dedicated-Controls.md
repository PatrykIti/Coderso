# TASK-427-01-L01: Content Compact Variant Runtime And Dedicated Controls
# FileName: TASK-427-01-L01-Content-Compact-Variant-Runtime-And-Dedicated-Controls.md

**Parent Subtask:** TASK-427-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-427-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Implement a real published-layout effect for the Content section's `compact`
variant and adopt the shared dedicated control widgets for the rest of the
section surface.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Real contract anchors (verified): the variant lives at section.variant
// (top-level on PageSectionV2 in core/services/pages/pageDocumentV2.ts),
// NOT section.layout.variant, and is resolved via the shared resolver.
const template = resolvePageSectionTemplate(section); // core/services/pages/pageSectionTemplates.ts

// The variant/template class lands on the INNER content div via
// contentClassName (toPageSectionRenderProps -> PageSectionContent in
// core/services/pages/pageRendererV2.tsx); the outer <section> keeps the
// static sectionClassName "w-full px-4 py-6". The compact branch of
// pageSectionTemplateClass already emits `${marker} content-start`, which is
// visually inert. Extend pageSectionTemplateClass(template) and/or
// toPageSectionStyle(section) so:
//   template.template === "content" && template.variant === "compact"
// yields a VISIBLE spacing change (e.g. reduced padding/gap scale) on the
// content node of the published front.
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

- `compact` must produce a MEASURABLE published-front spacing/layout
  difference versus `default` — e.g. a reduced section padding/gap scale via
  `toPageSectionStyle` / `pageSectionTemplateClass` — not merely a
  class-string difference. Note: the `content-start` + marker class on the
  inner content node is ALREADY emitted at HEAD and is visually inert, so a
  pure class-diff cannot satisfy this leaf.
- Content inspector uses shared segmented/swatch/slider/toggle widgets.
- Section updates keep using the shared section patch path.

Error handling:

- Unknown Content variants fall back to `default`.
- Legacy saved `compact` values keep rendering safely.

Regression-test shape:

- Runtime coverage asserting a VISIBLE spacing/layout difference between
  default and compact published output (computed spacing/style values or
  rendered structure) — a pure class-string assertion would already pass at
  HEAD and is not acceptable — plus UI coverage for control widgets.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Content-section fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Content runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
