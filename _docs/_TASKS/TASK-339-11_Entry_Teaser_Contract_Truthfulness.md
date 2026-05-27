# TASK-339-11: Entry Teaser Contract Truthfulness

# FileName: TASK-339-11_Entry_Teaser_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `entry-teaser` contract metadata match the richer editor that already
ships.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows `entry-teaser` renders
  `Visual=8` while the contract still declares `Visual=2`.
- The current UI already separates section context, source summary, teaser
  content, layout/media, CTA behavior, and fallback state; the contract lags
  behind that truth.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Add truthful section ids/roles that match the live UI. |
| `core/widgets/core/entryTeaser.tsx` | Replace the stale contract with the true rendered section inventory. |
| `tests/vitest/ui/entry-teaser-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/entryTeaser.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/ENTRY_TEASER.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
variant and structure
section context
source summary
teaser content fields
layout and media
style
cta behavior
fallback state
```

Data flow:

- Preserve the current richer UI and source/runtime behavior.
- Align the contract and stable DOM metadata to that UI.

Error handling:

- Keep Advanced read-only.
- Do not collapse the UI back to `Content display / Presentation`.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `entry-teaser` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/ENTRY_TEASER.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Entry Teaser keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
