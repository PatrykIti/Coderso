# TASK-190-05-01: Page Section Library and Composition Slots
# FileName: TASK-190-05-01_Page_Section_Library_and_Composition_Slots.md

**Priority:** High
**Category:** Assistant/Core + Page Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-190-04
**Status:** To Do

---

## Overview

Define reusable page section contribution types and slots.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintPageSectionTypes.ts`
- Add `core/services/assistant/blueprints/blueprintPageSectionLibrary.ts`
- Add `tests/vitest/assistant/blueprint-page-section-library.test.ts`

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

## Documentation Updates Required

- `_docs/WIDGET_PACK_MATRIX.md`
