# TASK-342-02-02: FAQ Accordion Visual Control Path Ownership

# FileName: TASK-342-02-02_FAQ_Accordion_Visual_Control_Path_Ownership.md

**Priority:** High
**Category:** Widgets + Admin UI + Playwright + QA
**Estimated Effort:** Small
**Dependencies:** TASK-342-01, TASK-342-02
**Status:** Done (2026-05-28)

---

## Overview

Repair the `faq-accordion` metadata-gap by adding persisted-path ownership to
the two remaining Visual rows that still render without it.

## Source Findings

- `_docs/PLAYWRIGHT/27-05-2026/REPORT_FAQ_ACCORDION_WIDGET.md`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
- `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `tests/vitest/widgets/faqAccordion.test.tsx`

Current local evidence:

- Color controls in the FAQ Visual panel already emit paths.
- The remaining gap is limited to:
  - `faq-accordion.style.panelRadius`
  - `faq-accordion.style.borderWidth`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add truthful `path` ownership to the flagged Visual `WidgetControlRow` controls. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Add a strict assertion that the flagged Visual controls now expose persisted paths. |
| `tests/vitest/widgets/faqAccordion.test.tsx` | Extend only if contract-visible behavior changes. |

## Implementation Pseudocode

```ts
<WidgetControlRow
  id="faq-accordion.style.panelRadius"
  path="style.panelRadius"
  label="Panel radius"
>
  ...
</WidgetControlRow>

<WidgetControlRow
  id="faq-accordion.style.borderWidth"
  path="style.borderWidth"
  label="Border width"
>
  ...
</WidgetControlRow>

test("faq accordion panel style controls expose persisted widget paths", async () => {
  const controls = collectWritableControls("faq-accordion", "visual");
  expect(controls).toContainEqual({
    id: "faq-accordion.style.panelRadius",
    path: "style.panelRadius",
  });
  expect(controls).toContainEqual({
    id: "faq-accordion.style.borderWidth",
    path: "style.borderWidth",
  });
});
```

Data flow:

- Persisted FAQ style schema stays unchanged.
- Only the DOM ownership metadata is repaired for the existing Visual rows.

Error handling:

- Do not move these controls into Advanced or convert them into support-only
  actions just to satisfy the smoke lane.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- targeted `playwright-cli` replay or single-widget smoke proving
  `faq-accordion` no longer reports `metadata-gap`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/27-05-2026/REPORT_FAQ_ACCORDION_WIDGET.md` when the
  metadata-gap is closed or superseded.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- `faq-accordion` no longer reports `metadata-gap` in the targeted rerun.
- `panelRadius` and `borderWidth` expose truthful persisted paths.

## Completion Notes (2026-05-28)

- `FaqAccordionEditors.tsx` now emits truthful persisted paths for
  `style.panelRadius` and `style.borderWidth`.
- Targeted validation passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `bun scripts/playwright-widget-contract-smoke.ts --session task-342-02-faq-accordion --widget faq-accordion --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-02-faq-accordion.json --output-md .tmp/task-342-02-faq-accordion.md --strict`
