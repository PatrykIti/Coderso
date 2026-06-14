# TASK-435-01-L01: CTA Variant Layout And Dedicated Controls
# FileName: TASK-435-01-L01-CTA-Variant-Layout-And-Dedicated-Controls.md

**Parent Subtask:** TASK-435-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-435-01
**Status:** ⏳ To Do

---

## Overview

Implement a visible published-front layout difference for the CTA `centered` and
`full-width` variants — reconciling the already-shipped `full-width` inline
`maxWidth: "none"` special-case at `core/services/pages/pageRendererV2.tsx:143`
and the hero/CTA class collapse in `pageSectionTemplateClass`
(`pageRendererV2.tsx:206-207`) — and replace the current native control drift
with the shared dedicated widgets.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Variant is a top-level section field (`section.variant`, PageSectionV2 in
// core/services/pages/pageDocumentV2.ts:199 — NOT section.layout.variant); resolve it via:
const template = resolvePageSectionTemplate(section); // pageSectionTemplates.ts:117; fallbackVariant "centered", so centered === default today
// Extend pageSectionTemplateClass (pageRendererV2.tsx:198-214): its hero/cta branch at
// :206-207 currently collapses every CTA variant to the same `place-items-center text-center`
// classes. Add per-variant CTA branches, and if full-width semantics change, adjust
// toPageSectionStyle while reconciling the existing special-case at :143
// (maxWidth: template.variant === "full-width" ? "none" : `${section.layout.maxWidth}px`).
// Classes land on the inner content div (contentClassName from toPageSectionRenderProps,
// pageRendererV2.tsx:235-258), not on the outer <section> shell, whose classes are static
// ("w-full px-4 py-6" at :242).
// Compare with the inert marker stripped, so the guard targets real layout classes and
// cannot pass on the always-different marker string alone:
const surface = (variant: PageSectionVariant) =>
  toPageSectionRenderProps({ ...section, variant })
    .contentClassName.replace(/page-section-template-\S+/g, "")
    .trim();
expect(surface("centered")).not.toEqual(surface("default"));
// identical today apart from the marker — must diverge once centered is visible
expect(toPageSectionRenderProps({ ...section, variant: "full-width" }).style.maxWidth).toBe("none");
// preserve the existing :143 special-case while adding the visible full-bleed treatment
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

- CTA variant edits produce a VISIBLE published-front layout difference, not a
  class-string or marker-only change: `centered` shows a real
  alignment/centering difference versus `default`, and `full-width` a true
  full-bleed treatment (beyond the existing inline `maxWidth: "none"` removal
  at `pageRendererV2.tsx:143` if that alone is not visibly sufficient).
- Inspector controls use the shared dedicated widgets.
- Existing content blocks remain valid inside the updated layout shells.

Error handling:

- Unknown variants fall back to the registry `fallbackVariant` (`centered` for
  CTA, `core/services/pages/pageSectionTemplates.ts:92-97`) via
  `resolvePageSectionTemplate`.
- Control migration must not change CTA content persistence semantics.

Regression-test shape:

- Runtime coverage asserting `default`/`centered`/`full-width` produce distinct
  published render props (contentClassName/style via
  `toPageSectionRenderProps`), a live published-front check of the visible
  difference, and UI coverage for dedicated controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned CTA fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- CTA runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
