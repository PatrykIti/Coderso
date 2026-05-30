# TASK-343-05: FAQ Accordion Audit Remediation Family

# FileName: TASK-343-05_FAQ_Accordion_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + FAQ Accordion + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, TASK-342
**Status:** Done (2026-05-30)

---

## Overview

Close the confirmed FAQ Accordion contract gap where `style.spacing` exists in
the renderer and editor contract but has no writable control, while admin
preview ARIA still drifts from runtime behavior.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_FAQ_ACCORDION_WIDGET.md:165-175`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx:623,1008+`
- `core/widgets/core/faqAccordion.tsx:88-95,164,384-387,1001-1205`

## Sub-Tasks

- [x] Add a truthful writable spacing control for `style.spacing`.
- [x] Align section description and Advanced summary with the real control
  surface.
- [x] Keep admin-preview `aria-expanded` synchronized or explicitly mark the
  preview as non-runtime.
- [x] Add regression coverage for spacing ownership and preview semantics.

## Completion Notes

- Visual `Layout and typography` now exposes a writable `Spacing` select for
  `style.spacing`.
- Renderer coverage proves spacing owns both list gap and panel padding output.
- Static SSR/admin-preview summaries no longer emit `aria-expanded`; the public
  runtime continues to set and synchronize it after binding.
- Advanced remains read-only and now truthfully reflects the selected spacing
  label in the layout summary.

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
    <WidgetControlRow id="faq-accordion.visual.spacing" label="Spacing" path="style.spacing">
      <Select value={value.style?.spacing ?? "md"} />
    </WidgetControlRow>
  );
}
```

Place the control in the existing
`faq-accordion.visual.layout-typography` section next to `Max width`, because
that section already promises spacing ownership.

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

## Validation Evidence

- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- `bun scripts/playwright-widget-contract-smoke.ts --widget faq-accordion --session task-343-05-faq-accordion --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-05-faq-accordion-smoke.json --output-md .tmp/task-343-05-faq-accordion-smoke.md`

Strict smoke passed with `adminFailures=0`, `publicFailures=0`,
`fixtureGaps=0`, and `metadataGaps=0`.
