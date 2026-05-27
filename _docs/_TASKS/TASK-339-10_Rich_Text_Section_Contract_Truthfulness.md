# TASK-339-10: Rich Text Section Contract Truthfulness

# FileName: TASK-339-10_Rich_Text_Section_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `rich-text-section` contract metadata match the richer editor that already
ships.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows `rich-text-section` renders
  `Visual=6`, `Advanced=4` while the contract still declares `Visual=2`,
  `Advanced=2`.
- The current UI already separates title copy, body content, structured blocks,
  reader options, and typography/colors; the contract simply lags behind.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Add truthful section ids/roles that match the live UI. |
| `core/widgets/core/richTextSection.tsx` | Replace the stale contract with the true rendered section inventory. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/RICH_TEXT_SECTION.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
variant and layout structure
title block copy
body content
structured content blocks
reader options
typography and colors
```

Data flow:

- Preserve the current richer UI and sanitizer behavior.
- Align the contract and stable DOM metadata to that UI.

Error handling:

- Keep Advanced read-only and diagnostic.
- Do not collapse the UI back to `Editorial content / Presentation`.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `rich-text-section` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Rich Text Section keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
