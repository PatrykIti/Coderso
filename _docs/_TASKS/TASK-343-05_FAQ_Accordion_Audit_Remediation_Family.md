# TASK-343-05: FAQ Accordion Audit Remediation Family

# FileName: TASK-343-05_FAQ_Accordion_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + FAQ Accordion + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, TASK-342
**Status:** To Do

---

## Overview

Close the confirmed FAQ Accordion contract gap where `style.spacing` exists in
the renderer and editor contract but has no writable control, while admin
preview ARIA still drifts from runtime behavior.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_FAQ_ACCORDION_WIDGET.md:165-175`
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_FAQ_ACCORDION_WIDGET.md:1-8` (section 5 findings)
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx:623,1008+`
- `core/widgets/core/faqAccordion.tsx:88-95,164,384-387,1001-1205`

## Sub-Tasks

- [ ] Add a truthful writable spacing control for `style.spacing`.
- [ ] Align section description and Advanced summary with the real control
  surface.
- [ ] Keep admin-preview `aria-expanded` synchronized or explicitly mark the
  preview as non-runtime.
- [ ] Add regression coverage for spacing ownership and preview semantics.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Expose `style.spacing` and align copy with the real control surface. |
| `core/widgets/core/faqAccordion.tsx` | Keep preview ARIA semantics truthful when runtime script does not execute. |
| `tests/vitest/widgets/faqAccordion.test.tsx` | Cover spacing render semantics. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Cover writable spacing and preview truthfulness. |

## Implementation Pseudocode

```ts
function renderFaqSpacingControl(value: FaqAccordionData) {
  return (
    <WidgetControlRow id="faq-accordion.spacing" label="Spacing" path="style.spacing">
      <Select value={value.style?.spacing ?? "md"} />
    </WidgetControlRow>
  );
}
```

## Regression Test Shape

- Changing spacing updates both panel gap and panel padding semantics.
- Advanced summary matches the chosen spacing.
- Admin preview does not expose stale `aria-expanded`.

## Security Contract

No API routes are added. Existing schema and JSON-LD boundaries stay strict.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_FAQ_ACCORDION_WIDGET.md`.
- Update `_docs/_WIDGETS/FAQ.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- `style.spacing` is editable from the actual editor surface.
- Editor copy and Advanced summary stop promising hidden controls.
- Admin preview no longer exposes stale expand/collapse semantics.
