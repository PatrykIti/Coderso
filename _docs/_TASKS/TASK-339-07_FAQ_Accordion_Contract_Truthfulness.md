# TASK-339-07: FAQ Accordion Contract Truthfulness

# FileName: TASK-339-07_FAQ_Accordion_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** To Do
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

## Acceptance Criteria

- FAQ Accordion keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
