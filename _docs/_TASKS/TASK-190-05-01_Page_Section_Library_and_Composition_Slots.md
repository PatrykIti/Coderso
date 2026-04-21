# TASK-190-05-01: Page Section Library and Composition Slots
# FileName: TASK-190-05-01_Page_Section_Library_and_Composition_Slots.md

**Priority:** High
**Category:** Assistant/Core + Page Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-190-03-01, TASK-190-04
**Status:** To Do

---

## Overview

Define reusable page section contribution types and slots.

This library should be a thin assistant-facing mapping layer over the existing
widget contract, not a second unrelated section catalog. Where the repo already
has source-of-truth metadata for composite widgets, section presets, module pack
coverage, and widget surfaces, this task should reuse it.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintPageSectionTypes.ts`
- Add `core/services/assistant/blueprints/blueprintPageSectionLibrary.ts`
- Update `core/widgets/modulePackMatrix.ts` or existing widget preset metadata
  only if the current section-preset contract needs a small helper seam for the
  composer
- Add `tests/vitest/assistant/blueprint-page-section-library.test.ts`

## Reuse Rules

- `blueprintPageSectionLibrary.ts` derives section availability from existing
  registered widgets, composite widget metadata, and current
  `pagePresets` / `sectionPresets` coverage instead of redefining those concepts
  in parallel.
- `Section Kinds` are assistant-facing aliases over current widget/preset
  building blocks, not a second source of truth for product readiness.
- Only widgets valid for current page-facing surfaces should participate in the
  page section library unless a later task explicitly extends the widget
  contract.
- Missing section coverage should stay gated/needs-input rather than creating ad
  hoc pseudo-sections outside the widget registry/module pack contract.

## Section Kinds

- `hero`
- `steps`
- `listing-filters`
- `content-list`
- `cta`
- `form-embed`
- `testimonials`
- `contact`
- `faq`
- `posts-feed`

## Pseudocode

```ts
type BlueprintPageSectionContribution = {
  id: string;
  slot: "hero" | "before-listing" | "listing" | "after-listing" | "footer";
  widgetType: string;
  data: Record<string, unknown>;
  requires?: string[];
  mergeKey?: string;
};
```

## Security Contract

- Visibility: internal planning.
- Auth model: unchanged.
- RBAC: page write permissions still enforced by page actions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: section data must pass widget schema.
- Anti-abuse: no arbitrary HTML/scripts.
- Secret handling: no secret-like defaults.

## Testing Requirements

- Section schema tests.
- Slot ordering tests.
- Missing widget capability tests.
- Section-library resolution stays aligned with current widget pack / preset
  metadata instead of drifting into a second section registry.

## Documentation Updates Required

- `_docs/WIDGET_PACK_MATRIX.md`
