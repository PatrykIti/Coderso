# TASK-339-07: FAQ Accordion Contract Truthfulness

# FileName: TASK-339-07_FAQ_Accordion_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** Done (2026-05-27)
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `faq-accordion` contract metadata match the richer editor that already
ships.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows `faq-accordion` renders
  `Visual=7` while the contract still declares `Visual=2`.
- The current UI already separates layout, display behavior, color, and search
  visibility concerns more clearly than the stale contract suggests.
- Playwright review evidence showed default FAQ theme tokens surfacing as
  `Saved custom color` instead of `Theme default`.
- Playwright review evidence also showed the color section still duplicating
  `Spacing`, plus missing Hero-style palettes and contrast guidance.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add truthful section ids/roles that match the live UI. |
| `core/widgets/core/faqAccordion.tsx` | Replace the stale two-section contract with the true rendered section inventory. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/faqAccordion.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/FAQ.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
// Keep the current rendered UI, but make the metadata truthful:
variant and layout structure
header copy
questions and answers
display behavior
layout and typography
colors and panel style
search visibility
```

Data flow:

- Preserve the existing richer UI.
- Align the contract and stable DOM metadata to that UI.
- Keep the richer UI, but also remove Hero-parity drift discovered during the
  browser review pass:
  - theme-token colors must read as theme defaults,
  - `Spacing` stays owned by `Layout and typography`,
  - `Colors and panel style` gets palette and contrast guidance affordances.

Error handling:

- Keep `Advanced` read-only.
- Do not collapse daily sections back to `Questions and answers / Presentation`.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `faq-accordion` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/FAQ.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Progress Notes

- 2026-05-27: Codex aligned `faqAccordionEditorContract` with the rendered
  FAQ section inventory and wired matching canonical section ids into the live
  editor DOM metadata.
- 2026-05-27: FAQ color authoring now treats shared theme tokens as
  `Theme default`, adds FAQ palettes plus contrast guidance, and removes the
  duplicated `Spacing` control from the colors section so ownership stays
  aligned with `Layout and typography`.
- 2026-05-27: Focused validation is green:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- 2026-05-27: Fresh Playwright evidence confirms:
  - Visual now shows `FAQ palettes`, `Contrast guidance`, and no duplicate
    `Spacing` inside `Colors and panel style`.
  - Advanced now reports default FAQ theme tokens as `Theme default` and
    includes header color summaries.
- 2026-05-27: Claude Playwright snapshot review returned `VERDICT: NO BLOCKERS`
  after the final Wizard seed and Advanced diagnostics parity pass.

## Acceptance Criteria

- FAQ Accordion keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
