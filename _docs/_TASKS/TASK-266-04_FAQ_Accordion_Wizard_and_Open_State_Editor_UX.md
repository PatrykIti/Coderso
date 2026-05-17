# TASK-266-04: FAQ Accordion Wizard and Open State Editor UX

# FileName: TASK-266-04_FAQ_Accordion_Wizard_and_Open_State_Editor_UX.md

**Priority:** Medium
**Category:** Widgets + Content + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-293, TASK-266
**Status:** To Do

---

## Overview

Improve FAQ Accordion editor clarity around Wizard coverage, item count, and
default-open choices.

This leaf covers report rows U4, U6, U8, and U9. It assumes TASK-256 owns the
runtime truthfulness of single-open behavior; this leaf improves FAQ-specific
editor copy and controls after that runtime contract is stable.

## Scope Boundary

In scope:

- Wizard field for `header.description`;
- visible item count/progress copy for editing many Q/A rows;
- default-open select labels that include the question text, not only `Item N`;
- Advanced `defaultOpenIndex` control that exposes `-1 = all collapsed` as an
  explicit option or segmented control instead of a raw number-only workflow.

Out of scope:

- changing runtime single-open behavior;
- generic shared select/control components;
- broad page-builder mode persistence.

## Sub-Tasks

- [ ] Add `header.description` to Wizard while preserving the minimal onboarding
  flow.
- [ ] Add a `current/total` item count in Visual Q/A management.
- [ ] Build a helper such as `getFaqItemLabel(item, index)` that returns a
  short question-aware label with a stable fallback.
- [ ] Use question-aware labels in Visual default-open controls and Advanced
  controls.
- [ ] Replace the raw Advanced number-only workflow with bounded options when
  the current item list is available, while still preserving a technical
  fallback for malformed payload inspection.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add Wizard description, item count, question-aware labels, and clearer Advanced open-state controls. |
| `core/widgets/core/faqAccordion.tsx` | Add exported label helper only if it belongs with the normalized FAQ contract; otherwise keep it editor-local. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Add mode-specific assertions for Wizard description, item counter, select labels, and `-1` UX. |
| `tests/vitest/widgets/faqAccordion.test.tsx` | Add helper coverage only if a helper is exported from the widget contract. |

## Implementation Pseudocode

Label helper:

```ts
function getFaqItemEditorLabel(item: FaqAccordionItem, index: number): string {
  const question = (item.question ?? "").trim();
  if (question.length > 0) {
    return `Item ${index + 1}: ${question.slice(0, 56)}`;
  }
  return `Item ${index + 1}: Untitled question`;
}
```

Visual default-open control:

```tsx
<SelectItem value="-1">None - all collapsed</SelectItem>
{items.map((item, index) => (
  <SelectItem key={item.id ?? index} value={String(index)}>
    {getFaqItemEditorLabel(item, index)}
  </SelectItem>
))}
```

Advanced flow:

```tsx
function handleAdvancedOpenChange(next: string) {
  updateOptions(value, onChange, { defaultOpenIndex: Number(next) });
}
```

Error handling:

- Empty questions keep a stable fallback label.
- Labels are display-only and do not persist truncated question text.
- `defaultOpenIndex` still normalizes through the existing widget normalizer.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless an exported helper requires schema
  fixture updates.
- Anti-abuse: labels use React text output, not `dangerouslySetInnerHTML`.
- Secret handling: no secrets in editor labels or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx` only if
  a helper moves into the widget contract
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before any manual commit that includes this leaf, also run:
  - `bun run lint`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FAQ.md` editor-mode section.
- Update `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` rows U4, U6, U8, and
  U9 after validation.

## Changelog Policy

- Covered by the TASK-266 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Wizard can edit both FAQ header title and description without leaving the
  beginner flow.
- Editors can identify the default-open target by question text.
- Advanced open-state controls make `all collapsed` understandable without
  requiring memorized numeric sentinels.
